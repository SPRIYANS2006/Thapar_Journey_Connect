import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/useAuth';

export function useJourneys() {
  const { user } = useAuth();
  const [myJourneys, setMyJourneys] = useState([]);
  const [activeJourney, setActiveJourney] = useState(null);
  const [matchedStudents, setMatchedStudents] = useState([]);
  const [matchingGroups, setMatchingGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMyJourneys = useCallback(async () => {
    if (!user) {
      setMyJourneys([]);
      return [];
    }
    try {
      const list = await api.getMyJourneys();
      const safe = Array.isArray(list) ? list : [];
      setMyJourneys(safe);
      return safe;
    } catch {
      return [];
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    if (user) {
      api.getMyJourneys()
        .then((list) => {
          if (!active) return;
          setMyJourneys(Array.isArray(list) ? list : []);
        })
        .catch(() => {});
    }

    return () => {
      active = false;
    };
  }, [user]);

  const submitJourney = async (journeyData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.createJourney(journeyData);
      setActiveJourney(res.journey);
      setMatchedStudents(res.matchedStudents || []);
      setMatchingGroups(res.matchingGroups || []);
      await fetchMyJourneys();
      return res;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    myJourneys,
    activeJourney,
    setActiveJourney,
    matchedStudents,
    matchingGroups,
    loading,
    error,
    submitJourney,
    fetchMyJourneys
  };
}
