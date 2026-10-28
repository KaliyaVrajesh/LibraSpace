import React, { useEffect, useState } from 'react'
import {
  Users,
  Layers,
  LayoutGrid,
  Calendar,
  TrendingUp,
  BookOpen,
  BarChart2,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts'
import { dashboardService } from '../../services/dashboard.service'
import type { AdminDashboardData } from '../../types'
import { BookingStatusBadge } from '../../components/ui/Badge'
import { PageLoader, SkeletonCard } from '../../components/ui/LoadingSpinner'
import { Alert } from '../../components/ui/Alert'
import { getErrorMessage } from '../../services/api'
import { format } from 'date-fns'

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color: string
}) {
  return (
    <div className="card">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3 ${color}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-2xl font-bold text-navy-900">{value}</p>
      <p className="text-sm text-navy-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-navy-400 mt-1">{sub}</p>}
    </div>
  )
}

export function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    dashboardService.getAdminDashboard()
      .then(setData)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />
  if (error) return <div className="max-w-7xl mx-auto px-4 py-8"><Alert variant="error" message={error} /></div>
  if (!data) return null

  const { stats, booking_trends, floor_stats, recent_bookings, status_breakdown } = data

  const trendData = booking_trends.map((d) => ({
    date: format(new Date(d.date + 'T00:00:00'), 'MMM d'),
    Bookings: d.bookings,
  }))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">Library operations overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Active Students" value={stats.total_students} color="bg-accent-50 text-accent-600" />
        <StatCard icon={Layers} label="Active Floors" value={stats.total_floors} color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={LayoutGrid} label="Active Seats" value={stats.total_seats} color="bg-sky-50 text-sky-600" />
        <StatCard icon={Calendar} label="Today's Bookings" value={stats.todays_bookings} color="bg-amber-50 text-amber-600" />
        <StatCard icon={TrendingUp} label="Total Bookings" value={stats.total_bookings} color="bg-purple-50 text-purple-600" />
        <StatCard icon={BookOpen} label="Active Reservations" value={stats.active_bookings} color="bg-rose-50 text-rose-600" />
        <StatCard
          icon={BarChart2}
          label="Seat Utilization"
          value={`${stats.seat_utilization_percent}%`}
          sub="Based on today's bookings"
          color="bg-orange-50 text-orange-600"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Booking trend */}
        <div className="card">
          <h2 className="text-base font-semibold text-navy-900 mb-5">Booking Trend (14 Days)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="bookingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="Bookings"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#bookingGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Floor stats */}
        <div className="card">
          <h2 className="text-base font-semibold text-navy-900 mb-5">Bookings by Floor (30 Days)</h2>
          {floor_stats.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-navy-400">
              <p className="text-sm">No booking data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={floor_stats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="floor" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="bookings" fill="#1e3a72" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent bookings */}
      <div className="card overflow-hidden p-0">
        <div className="px-6 py-4 border-b border-navy-100">
          <h2 className="text-base font-semibold text-navy-900">Recent Bookings</h2>
        </div>
        {recent_bookings.length === 0 ? (
          <div className="text-center py-12 text-navy-400">
            <BookOpen className="h-10 w-10 mx-auto mb-3 text-navy-200" />
            <p className="text-sm">No bookings yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-navy-50/60">
                  {['Reference', 'Student', 'Seat', 'Date', 'Time', 'Status'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-navy-600 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {recent_bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-navy-50/40">
                    <td className="px-4 py-3 text-xs font-mono text-navy-700">{b.booking_reference}</td>
                    <td className="px-4 py-3 text-sm text-navy-700">{b.user?.full_name}</td>
                    <td className="px-4 py-3 text-sm font-medium text-navy-900">
                      {b.seat?.seat_label} <span className="text-navy-400 font-normal text-xs">({b.seat?.floor?.name})</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-navy-600">
                      {format(new Date(b.booking_date + 'T00:00:00'), 'dd MMM yyyy')}
                    </td>
                    <td className="px-4 py-3 text-sm text-navy-600">{b.start_time}–{b.end_time}</td>
                    <td className="px-4 py-3">
                      <BookingStatusBadge status={b.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
