import React from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  ArrowRight,
  Shield,
  Zap,
  Users,
  BarChart3,
} from 'lucide-react'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-surface">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 text-white">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-accent-600/20 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-navy-600/40 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-accent-300 mb-6 backdrop-blur-sm border border-white/10">
              <Zap className="h-3.5 w-3.5" />
              Smart Library Management
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight mb-6">
              Reserve Your Perfect{' '}
              <span className="text-accent-400">Study Space</span>
            </h1>
            <p className="text-lg md:text-xl text-navy-200 mb-10 max-w-2xl leading-relaxed">
              LibraSpace makes it effortless to find and book library seats in real time.
              Browse available seats across floors, reserve a spot, and focus on what
              matters — your studies.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/register" className="btn-accent btn-lg">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/login" className="btn bg-white/10 text-white border border-white/20 hover:bg-white/20 btn-lg backdrop-blur-sm">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="bg-white border-b border-navy-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              { label: 'Library Floors', value: '4+', icon: MapPin },
              { label: 'Study Seats', value: '90+', icon: BookOpen },
              { label: 'Daily Bookings', value: 'Real-time', icon: Calendar },
              { label: 'Seat Types', value: '5 Types', icon: CheckCircle },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-accent-50 text-accent-600">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xl font-bold text-navy-900">{value}</p>
                  <p className="text-xs text-navy-500">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-navy-900 mb-3">
            Everything you need to study effectively
          </h2>
          <p className="text-navy-500 max-w-xl mx-auto">
            A modern seat booking system built for students and library staff alike.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Zap,
              title: 'Real-Time Availability',
              description:
                'See which seats are available instantly. The map updates after every booking so you always have accurate information.',
              color: 'bg-accent-50 text-accent-600',
            },
            {
              icon: MapPin,
              title: 'Interactive Seat Map',
              description:
                'Browse a visual floor map to choose the perfect seat. Filter by type — quiet zones, window seats, computer stations, and more.',
              color: 'bg-emerald-50 text-emerald-600',
            },
            {
              icon: Calendar,
              title: 'Flexible Scheduling',
              description:
                'Book seats for any date and time within library hours. Choose your preferred start and end time, up to 4 hours per session.',
              color: 'bg-amber-50 text-amber-600',
            },
            {
              icon: Clock,
              title: 'Easy Cancellation',
              description:
                'Change of plans? Cancel any upcoming booking before it starts. Your booking history is always accessible.',
              color: 'bg-rose-50 text-rose-600',
            },
            {
              icon: Shield,
              title: 'Secure Access',
              description:
                'Role-based access ensures students manage their own bookings, while admins have full oversight and management capability.',
              color: 'bg-purple-50 text-purple-600',
            },
            {
              icon: BarChart3,
              title: 'Admin Insights',
              description:
                'Library staff get real-time dashboards showing occupancy trends, booking statistics, and floor utilization.',
              color: 'bg-sky-50 text-sky-600',
            },
          ].map(({ icon: Icon, title, description, color }) => (
            <div key={title} className="card hover:shadow-card-hover transition-shadow duration-200">
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-4 ${color}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="text-base font-semibold text-navy-900 mb-2">{title}</h3>
              <p className="text-sm text-navy-600 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="bg-navy-50 border-y border-navy-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-navy-900 mb-3">How it works</h2>
            <p className="text-navy-500">Book your seat in three easy steps.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Create your account',
                description: 'Sign up with your university email. Your account is instantly ready to use.',
                icon: Users,
              },
              {
                step: '02',
                title: 'Browse & select a seat',
                description: 'Pick a floor, choose your date and time, then click an available seat on the map.',
                icon: MapPin,
              },
              {
                step: '03',
                title: 'Confirm your booking',
                description: 'Review the summary and confirm. You\'ll receive a unique booking reference immediately.',
                icon: CheckCircle,
              },
            ].map(({ step, title, description, icon: Icon }) => (
              <div key={step} className="relative text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-navy-800 text-white mb-5">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="absolute top-7 left-[calc(50%+28px)] hidden sm:block w-[calc(100%-56px)] border-t-2 border-dashed border-navy-200" aria-hidden="true" />
                <p className="text-xs font-semibold text-accent-600 tracking-widest mb-1">STEP {step}</p>
                <h3 className="text-base font-semibold text-navy-900 mb-2">{title}</h3>
                <p className="text-sm text-navy-600">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-navy-800 to-navy-700 rounded-3xl p-10 md:p-16 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to claim your study spot?
          </h2>
          <p className="text-navy-300 mb-8 max-w-lg mx-auto">
            Join your fellow students. Book your seat now and never worry about finding a place to study.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/register" className="btn-accent btn-lg">
              Create Free Account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/login" className="btn bg-white/10 text-white border border-white/20 hover:bg-white/20 btn-lg">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-navy-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-navy-800">
                <BookOpen className="h-3.5 w-3.5 text-white" aria-hidden="true" />
              </div>
              <span className="text-base font-bold text-navy-900">
                Libra<span className="text-accent-600">Space</span>
              </span>
            </div>
            <p className="text-sm text-navy-400">
              © {new Date().getFullYear()} LibraSpace — Smart Library Seat Booking System
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
