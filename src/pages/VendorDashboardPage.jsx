import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  Package,
  CheckCircle,
  MapPin,
  Phone,
  Search,
  User,
  RefreshCw,
  KeyRound,
  X,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { formatTime24to12 } from '../utils/matchingEngine';

export default function VendorDashboardPage({ user, triggerToast }) {
  const [batches, setBatches] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('Today');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Driver Assignment Modal
  const [assigningOrder, setAssigningOrder] = useState(null);
  const [driverName, setDriverName] = useState('Gurpreet Singh');
  const [driverPhone, setDriverPhone] = useState('9876501234');
  const [vehicleNumber, setVehicleNumber] = useState('PB 11 CD 4589');

  // OTP Verification Modal
  const [verifyingOrder, setVerifyingOrder] = useState(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Status update
  const [updatingId, setUpdatingId] = useState(null);

  const fetchVendorData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getVendorRequests({
        date: selectedDate === 'all' ? '' : selectedDate,
        status: selectedStatus
      });
      if (res) {
        setBatches(res.groupedBatches || []);
        setAllRequests(res.allRequests || []);
      }
    } catch (err) {
      console.warn('Failed to load vendor requests:', err);
      if (triggerToast) {
        triggerToast(err.message || 'Error fetching vendor requests.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedStatus, triggerToast]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api.getVendorRequests({
          date: selectedDate === 'all' ? '' : selectedDate,
          status: selectedStatus
        });
        if (!cancelled && res) {
          setBatches(res.groupedBatches || []);
          setAllRequests(res.allRequests || []);
        }
      } catch (err) {
        if (!cancelled) console.warn(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedDate, selectedStatus]);

  if (!user || (!['vendor', 'admin'].includes(user.role))) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-3xl mx-auto flex items-center justify-center">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-500">
          This portal is reserved for campus-affiliated transport vendors and administrators.
        </p>
      </div>
    );
  }

  // Handle Driver Assignment
  const handleAssignDriver = async (e) => {
    e.preventDefault();
    if (!assigningOrder) return;
    try {
      const res = await api.assignVendorDriver(assigningOrder.id, {
        driverName,
        driverPhone,
        vehicleNumber
      });
      if (triggerToast) triggerToast(res.message, 'success');
      setAssigningOrder(null);
      await fetchVendorData();
    } catch (err) {
      if (triggerToast) triggerToast(err.message || 'Assignment failed.', 'error');
    }
  };

  // Handle OTP Verification
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!verifyingOrder) return;
    setOtpError('');
    setIsVerifying(true);
    try {
      const res = await api.verifyLuggagePickup(verifyingOrder.id, enteredOtp);
      if (triggerToast) triggerToast(res.message, 'success');
      setVerifyingOrder(null);
      setEnteredOtp('');
      await fetchVendorData();
    } catch (err) {
      setOtpError(err.message || 'Invalid OTP code.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle Status Update (In Transit / Delivered)
  const handleStatusTransition = async (id, status) => {
    setUpdatingId(id);
    try {
      const res = await api.updateVendorLuggageStatus(id, status);
      if (triggerToast) triggerToast(res.message, 'success');
      await fetchVendorData();
    } catch (err) {
      if (triggerToast) triggerToast(err.message || 'Status update failed.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  // Stats calculation
  const totalBags = allRequests.reduce((sum, r) => sum + (r.totalItemsCount || 1), 0);
  const activeOrders = allRequests.filter((r) => !['Delivered', 'Cancelled'].includes(r.status)).length;
  const inTransitCount = allRequests.filter((r) => r.status === 'In Transit').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold bg-blue-500/30 text-blue-300 border border-blue-400/30 px-3 py-0.5 rounded-full flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-blue-400" />
                <span>Vendor Dispatch Console</span>
              </span>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-0.5 rounded-full border border-emerald-400/30">
                {user.role === 'admin' ? 'Administrator' : 'Verified Logistics Partner'}
              </span>
            </div>
            <h1 className="text-3xl font-black text-white">Campus Luggage Operations Hub</h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Manage student parcel requests, dispatch drivers, verify pickup OTPs, and track pooled batches.
            </p>
          </div>

          <button
            onClick={fetchVendorData}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Orders</span>
          </button>
        </div>

        {/* Quick KPI Stat Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-400">Active Orders</span>
            <div className="text-2xl font-black text-white">{activeOrders}</div>
          </div>
          <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-400">Pooled Batches</span>
            <div className="text-2xl font-black text-indigo-400">{batches.length}</div>
          </div>
          <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Bags / Trunks</span>
            <div className="text-2xl font-black text-emerald-400">{totalBags}</div>
          </div>
          <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-400">In Transit</span>
            <div className="text-2xl font-black text-amber-400">{inTransitCount}</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Selector */}
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
          >
            <option value="Today">Today</option>
            <option value="Tomorrow">Tomorrow</option>
            <option value="all">All Dates</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
          >
            <option value="all">All Statuses</option>
            <option value="Requested">Requested</option>
            <option value="Vendor Assigned">Vendor Assigned</option>
            <option value="Picked Up">Picked Up</option>
            <option value="In Transit">In Transit</option>
            <option value="Delivered">Delivered</option>
          </select>
        </div>

        {/* Keyword Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student or destination..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Batches & Pooled Groups List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          Loading vendor dispatch orders...
        </div>
      ) : batches.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <Package className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-900 text-base">No Requests Found</h3>
          <p className="text-slate-500 text-xs">
            No student luggage bookings match the current date and status filters.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {batches.map((batch) => {
            const isPooled = batch.totalOrders > 1;
            return (
              <div
                key={batch.groupKey}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Batch Header Bar */}
                <div className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${
                  isPooled
                    ? 'bg-gradient-to-r from-indigo-50/80 via-blue-50/60 to-white border-indigo-100'
                    : 'bg-slate-50/70 border-slate-100'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white shadow-xs ${
                      isPooled ? 'bg-indigo-600' : 'bg-slate-800'
                    }`}>
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-slate-900">
                          {formatTime24to12(batch.slotTime)} ({batch.date})
                        </span>
                        {isPooled && (
                          <span className="text-[10px] font-black uppercase bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md">
                            Pooled Batch ({batch.totalOrders} Students)
                          </span>
                        )}
                      </div>
                      <h3 className="font-black text-slate-900 text-base">
                        TIET Campus → {batch.destination}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
                    <div>
                      Total Bags:{' '}
                      <strong className="text-slate-900 font-black">{batch.totalBags}</strong>
                    </div>
                    <div>
                      Estimated Gross:{' '}
                      <strong className="text-blue-700 font-black">₹{batch.totalFare}</strong>
                    </div>
                  </div>
                </div>

                {/* Orders in this Batch */}
                <div className="divide-y divide-slate-100">
                  {batch.orders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                    >
                      {/* Student Info */}
                      <div className="space-y-1.5 min-w-[240px]">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md">
                            #{ord.id}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            ord.status === 'Delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ord.status === 'Cancelled'
                              ? 'bg-rose-100 text-rose-800'
                              : ord.status === 'Picked Up' || ord.status === 'In Transit'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {ord.status}
                          </span>
                        </div>

                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{ord.userName}</span>
                          <span className="text-xs font-normal text-slate-500">
                            ({ord.userHostel || 'Campus'})
                          </span>
                        </div>

                        <div className="text-xs text-slate-500 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="font-mono">{ord.userPhone || 'No phone'}</span>
                        </div>

                        <div className="text-xs text-slate-600 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-blue-600" />
                          <span>Pickup: <strong>{ord.pickupLocation}</strong></span>
                        </div>
                      </div>

                      {/* Items & Notes */}
                      <div className="text-xs text-slate-600 space-y-1 max-w-sm">
                        <div className="font-semibold text-slate-900">
                          {ord.vehicleType} • {ord.totalItemsCount} Bags
                        </div>
                        <div className="text-slate-500">
                          {ord.items.map((it) => `${it.count}x ${it.size}`).join(', ')}
                        </div>
                        {ord.notes && (
                          <div className="text-amber-800 bg-amber-50 px-2 py-1 rounded-md text-[11px]">
                            📝 {ord.notes}
                          </div>
                        )}
                      </div>

                      {/* Driver & Assignment Details */}
                      <div className="text-xs text-slate-600 space-y-1 min-w-[180px]">
                        {ord.driverName ? (
                          <>
                            <div className="font-bold text-slate-900">Driver: {ord.driverName}</div>
                            <div className="font-mono text-slate-500">{ord.vehicleNumber}</div>
                            <div className="text-emerald-700 font-mono">{ord.driverPhone}</div>
                          </>
                        ) : (
                          <span className="text-amber-600 italic font-semibold">
                            ⚠️ Awaiting Driver Assignment
                          </span>
                        )}
                      </div>

                      {/* Vendor Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {/* 1. Assign Driver */}
                        {ord.status === 'Requested' && (
                          <button
                            type="button"
                            onClick={() => {
                              setAssigningOrder(ord);
                            }}
                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Assign Driver</span>
                          </button>
                        )}

                        {/* 2. Verify Pickup via Student OTP */}
                        {ord.status === 'Vendor Assigned' && (
                          <button
                            type="button"
                            onClick={() => {
                              setVerifyingOrder(ord);
                              setEnteredOtp('');
                              setOtpError('');
                            }}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Verify Pickup (OTP)</span>
                          </button>
                        )}

                        {/* 3. Mark In Transit */}
                        {ord.status === 'Picked Up' && (
                          <button
                            type="button"
                            disabled={updatingId === ord.id}
                            onClick={() => handleStatusTransition(ord.id, 'In Transit')}
                            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Mark In Transit</span>
                          </button>
                        )}

                        {/* 4. Mark Delivered */}
                        {ord.status === 'In Transit' && (
                          <button
                            type="button"
                            disabled={updatingId === ord.id}
                            onClick={() => handleStatusTransition(ord.id, 'Delivered')}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Mark Delivered</span>
                          </button>
                        )}

                        {ord.status === 'Delivered' && (
                          <span className="text-xs text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-md">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Completed</span>
                          </span>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Driver Assignment Modal */}
      {assigningOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-lg">Assign Dispatch Driver</h3>
                <p className="text-xs text-slate-500">Order #{assigningOrder.id}</p>
              </div>
              <button
                onClick={() => setAssigningOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignDriver} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Driver Name</label>
                <input
                  type="text"
                  required
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Driver Phone</label>
                <input
                  type="tel"
                  required
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle Registration Number</label>
                <input
                  type="text"
                  required
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAssigningOrder(null)}
                  className="py-2.5 px-4 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OTP Verification Modal */}
      {verifyingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-lg">Verify Handover OTP</h3>
                <p className="text-xs text-slate-500">Order #{verifyingOrder.id} • {verifyingOrder.userName}</p>
              </div>
              <button
                onClick={() => setVerifyingOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center space-y-2">
                <span className="text-xs text-slate-500">
                  Ask {verifyingOrder.userName} for their 4-digit pickup OTP:
                </span>
                <input
                  type="text"
                  maxLength={4}
                  required
                  autoFocus
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • •"
                  className="w-48 mx-auto tracking-widest text-center text-3xl font-mono font-black bg-slate-50 border-2 border-indigo-400 rounded-2xl py-3 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                />
                {otpError && (
                  <p className="text-xs font-bold text-rose-600">{otpError}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setVerifyingOrder(null)}
                  className="py-2.5 px-4 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enteredOtp.length < 4 || isVerifying}
                  className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-40"
                >
                  {isVerifying ? 'Verifying...' : 'Verify & Collect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
