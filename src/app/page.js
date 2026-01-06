'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Menu, X, Calendar, Building2, Users, Zap, Shield, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">SR</span>
              </div>
              <span className="text-lg font-bold text-gray-900 hidden sm:inline">
                Smile Returns
              </span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                Features
              </a>
              <a href="#about" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                About
              </a>
              <a href="#contact" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                Contact
              </a>
              <Link href="/auth/sign-in">
                <Button variant="outline" className="text-sm">
                  Sign In
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-100 py-4 space-y-4">
              <a href="#features" className="block text-gray-600 hover:text-gray-900 font-medium">
                Features
              </a>
              <a href="#about" className="block text-gray-600 hover:text-gray-900 font-medium">
                About
              </a>
              <a href="#contact" className="block text-gray-600 hover:text-gray-900 font-medium">
                Contact
              </a>
              <Link href="/auth/sign-in">
                <Button variant="outline" className="w-full justify-center">
                  Sign In
                </Button>
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="flex flex-col justify-center space-y-6">
              <div className="space-y-4">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                  Healthcare Made <span className="text-indigo-600">Simple</span>
                </h1>
                <p className="text-lg text-gray-600 leading-relaxed">
                  A unified platform for hospitals to manage appointments, patients, and operations seamlessly. Built for modern healthcare.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/auth/sign-up" className="w-full sm:w-auto">
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-base">
                    <Building2 size={20} className="mr-2" />
                    Register Your Hospital
                  </Button>
                </Link>
                <button className="w-full sm:w-auto h-12 border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 rounded-lg font-medium transition flex items-center justify-center">
                  <Calendar size={20} className="mr-2" />
                  Book Appointment
                </button>
              </div>

              {/* Trust Badges */}
              <div className="pt-8 flex flex-col sm:flex-row gap-4 sm:gap-8 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Shield size={18} className="text-green-600" />
                  <span>HIPAA Compliant</span>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp size={18} className="text-blue-600" />
                  <span>500+ Hospitals</span>
                </div>
              </div>
            </div>

            {/* Right Visual */}
            <div className="hidden md:flex items-center justify-center">
              <div className="relative w-full h-96">
                {/* Placeholder for dashboard preview */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-gray-200 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <Users size={48} className="mx-auto text-indigo-600" />
                    <p className="text-gray-600 font-medium">Dashboard Preview</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-gray-50 px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
              Powerful Features for Modern Hospitals
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to run a hospital efficiently
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                icon: Calendar,
                title: 'Smart Scheduling',
                description: 'Automated appointment booking with real-time availability',
              },
              {
                icon: Users,
                title: 'Patient Management',
                description: 'Complete patient profiles with medical history and records',
              },
              {
                icon: Zap,
                title: 'Instant Notifications',
                description: 'Real-time alerts and updates for all stakeholders',
              },
              {
                icon: TrendingUp,
                title: 'Analytics & Reporting',
                description: 'Comprehensive insights into hospital operations',
              },
              {
                icon: Building2,
                title: 'Multi-Hospital',
                description: 'Manage multiple hospitals from a single platform',
              },
              {
                icon: Shield,
                title: 'Secure & Compliant',
                description: 'Enterprise-grade security with HIPAA compliance',
              },
            ].map((feature, index) => (
              <div key={index} className="bg-white p-6 sm:p-8 rounded-xl border border-gray-200 hover:border-indigo-300 transition space-y-4">
                <feature.icon size={32} className="text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
            {[
              { label: 'Active Hospitals', value: '500+' },
              { label: 'Patients Managed', value: '1M+' },
              { label: 'Appointments', value: '10M+' },
              { label: 'Countries', value: '15+' },
            ].map((stat, index) => (
              <div key={index} className="text-center space-y-2">
                <p className="text-2xl sm:text-3xl font-bold text-indigo-600">{stat.value}</p>
                <p className="text-gray-600 text-sm sm:text-base">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold">
              Ready to Transform Your Hospital?
            </h2>
            <p className="text-lg text-indigo-100">
              Join hundreds of hospitals already using Smile Returns
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/auth/sign-up">
              <Button className="w-full sm:w-auto bg-white text-indigo-600 hover:bg-gray-100 h-12 text-base font-semibold">
                Register Your Hospital
              </Button>
            </Link>
            <button className="w-full sm:w-auto h-12 border-2 border-white text-white hover:bg-indigo-600 rounded-lg font-semibold transition">
              Schedule a Demo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">SR</span>
                </div>
                <span className="font-bold text-white">Smile Returns</span>
              </div>
              <p className="text-sm">Healthcare management reimagined</p>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-white">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Features</a></li>
                <li><a href="#" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition">Security</a></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-white">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Careers</a></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-white">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms</a></li>
                <li><a href="#" className="hover:text-white transition">Compliance</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-sm">&copy; 2024 Smile Returns. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 sm:mt-0 text-sm">
              <a href="#" className="hover:text-white transition">Twitter</a>
              <a href="#" className="hover:text-white transition">LinkedIn</a>
              <a href="#" className="hover:text-white transition">Facebook</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
