import mongoose from 'mongoose';
import { AsyncLocalStorage } from 'node:async_hooks';
import { User } from '../models/User.js';

mongoose.set('transactionAsyncLocalStorage', true);
const effects = new AsyncLocalStorage();

export function afterCommit(effect) {
  const pending = effects.getStore();
  if (pending) pending.push(effect);
  else effect();
}

export async function runCommittedTransaction(work) {
  if (effects.getStore()) return work();
  let pending;
  const result = await mongoose.connection.transaction(async () => {
    pending = [];
    return effects.run(pending, work);
  });
  for (const effect of pending) {
    try { effect(); } catch (error) { console.error('Post-commit notification failed:', error.message); }
  }
  return result;
}

// Only JSON mutation handlers are wrapped. Authentication and validation still
// run first. Responses and external effects are released after a durable commit.
export function transactionalRouter(router) {
  for (const method of ['post', 'put', 'patch', 'delete']) {
    const register = router[method].bind(router);
    router[method] = (path, ...handlers) => {
      const handler = handlers.pop();
      return register(path, ...handlers, async (req, res, next) => {
        try {
          let response;
          let committedEffects;
          await mongoose.connection.transaction(async () => {
            response = undefined;
            if (req.user) {
              const user = await User.findOne({ id: req.user.id });
              if (!user || user.disabled || user.token_version !== req.user.token_version) {
                const error = new Error('Session expired. Please sign in again.');
                error.status = 401;
                throw error;
              }
              req.user = user;
            }
            const pending = [];
            const reply = Object.create(res);
            let status = 200;
            reply.status = value => { status = value; return reply; };
            reply.json = body => { response = { status, body }; return reply; };
            await effects.run(pending, () => handler(req, reply, error => { throw error; }));
            if (!response) throw new Error('Mutation did not produce a response.');
            committedEffects = pending;
          });
          for (const effect of committedEffects) {
            try { effect(); } catch (error) { console.error('Post-commit notification failed:', error.message); }
          }
          res.status(response.status).json(response.body);
        } catch (error) { next(error); }
      });
    };
  }
  return router;
}
