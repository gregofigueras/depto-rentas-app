import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import PaymentsDashboard from './components/PaymentsDashboard';
import CalendarView from './components/CalendarView';
import BookingsView from './components/BookingsView';
import GuestsCRM from './components/GuestsCRM';
import ExpensesView from './components/ExpensesView';
import QuickCalculator from './components/QuickCalculator';
import NewBookingModal from './components/NewBookingModal';
import AddPaymentModal from './components/AddPaymentModal';
import WhatsAppShareModal from './components/WhatsAppShareModal';
import CheckoutModal from './components/CheckoutModal';
import { api } from './utils/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [guests, setGuests] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [newBookingInitialData, setNewBookingInitialData] = useState(null);
  const [newBookingDateRange, setNewBookingDateRange] = useState(null);

  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState(null);

  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [selectedBookingForWhatsApp, setSelectedBookingForWhatsApp] = useState(null);

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedBookingForCheckout, setSelectedBookingForCheckout] = useState(null);

  // Fetch all primary data
  const fetchData = useCallback(async () => {
    try {
      const [statsData, bookingsData, guestsData, expensesData] = await Promise.all([
        api.getStats(),
        api.getBookings(),
        api.getGuests(),
        api.getExpenses(),
      ]);

      setStats(statsData);
      setBookings(bookingsData);
      setGuests(guestsData);
      setExpenses(expensesData);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Modal open helpers
  const handleOpenAddPayment = (booking) => {
    setSelectedBookingForPayment(booking);
    setIsAddPaymentOpen(true);
  };

  const handleOpenWhatsApp = (booking) => {
    setSelectedBookingForWhatsApp(booking);
    setIsWhatsAppOpen(true);
  };

  const handleOpenCheckout = (booking) => {
    setSelectedBookingForCheckout(booking);
    setIsCheckoutOpen(true);
  };

  const handleOpenNewBooking = () => {
    setNewBookingInitialData(null);
    setNewBookingDateRange(null);
    setIsNewBookingOpen(true);
  };

  const handleOpenEditBooking = (booking) => {
    setNewBookingInitialData(booking);
    setNewBookingDateRange(null);
    setIsNewBookingOpen(true);
  };

  const handleOpenNewBookingWithDates = (dateRange) => {
    setNewBookingInitialData(null);
    setNewBookingDateRange(dateRange);
    setIsNewBookingOpen(true);
  };

  // Actions
  const handleCreateOrUpdateBooking = async (payload) => {
    if (newBookingInitialData) {
      await api.updateBooking(newBookingInitialData.id, payload);
    } else {
      await api.createBooking(payload);
    }
    await fetchData();
  };

  const handlePaymentAdded = async (paymentData) => {
    await api.addPayment(paymentData);
    await fetchData();
  };

  const handleCheckoutSuccess = async (feedbackData) => {
    if (!selectedBookingForCheckout) return;
    await api.completeCheckout(selectedBookingForCheckout.id, feedbackData);
    await fetchData();
  };

  const handleDeleteBooking = async (id) => {
    await api.deleteBooking(id);
    await fetchData();
  };

  const handleCreateExpense = async (data) => {
    await api.createExpense(data);
    await fetchData();
  };

  const handleDeleteExpense = async (id) => {
    await api.deleteExpense(id);
    await fetchData();
  };

  const handleCreateGuest = async (data) => {
    await api.createGuest(data);
    await fetchData();
  };

  const handleUpdateGuest = async (id, data) => {
    await api.updateGuest(id, data);
    await fetchData();
  };

  const handleDeleteGuest = async (id) => {
    await api.deleteGuest(id);
    await fetchData();
  };

  const handleSyncIcal = async (url) => {
    const res = await api.syncIcal(url);
    await fetchData();
    return res;
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-bold text-slate-600">Cargando Depto Temporario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 pb-16">
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingPaymentsCount={stats?.activeStats?.pendingCount || 0}
        onOpenCalculator={() => setIsCalculatorOpen(true)}
        onOpenNewBooking={handleOpenNewBooking}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            stats={stats}
            onOpenNewBooking={handleOpenNewBooking}
            onOpenNewExpense={() => {
              setActiveTab('expenses');
            }}
            onOpenCalculator={() => setIsCalculatorOpen(true)}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onRefresh={fetchData}
          />
        )}

        {activeTab === 'payments' && (
          <PaymentsDashboard
            bookings={bookings}
            onOpenAddPayment={handleOpenAddPayment}
            onOpenWhatsApp={handleOpenWhatsApp}
            onOpenCheckout={handleOpenCheckout}
            onRefresh={fetchData}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            bookings={bookings}
            onOpenNewBookingWithDates={handleOpenNewBookingWithDates}
            onOpenWhatsApp={handleOpenWhatsApp}
            onOpenAddPayment={handleOpenAddPayment}
            onSyncIcal={handleSyncIcal}
          />
        )}

        {activeTab === 'bookings' && (
          <BookingsView
            bookings={bookings}
            onOpenNewBooking={handleOpenNewBooking}
            onOpenEditBooking={handleOpenEditBooking}
            onOpenAddPayment={handleOpenAddPayment}
            onOpenWhatsApp={handleOpenWhatsApp}
            onOpenCheckout={handleOpenCheckout}
            onDeleteBooking={handleDeleteBooking}
          />
        )}

        {activeTab === 'guests' && (
          <GuestsCRM
            guests={guests}
            onCreateGuest={handleCreateGuest}
            onUpdateGuest={handleUpdateGuest}
            onDeleteGuest={handleDeleteGuest}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpensesView
            expenses={expenses}
            onCreateExpense={handleCreateExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        )}
      </main>

      {/* Modals */}
      <QuickCalculator
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        onApplyAmount={(amount) => {
          setNewBookingInitialData({ total_price: amount });
          setIsNewBookingOpen(true);
        }}
      />

      <NewBookingModal
        isOpen={isNewBookingOpen}
        onClose={() => setIsNewBookingOpen(false)}
        guests={guests}
        onBookingCreated={handleCreateOrUpdateBooking}
        initialData={newBookingInitialData}
        initialDateRange={newBookingDateRange}
      />

      <AddPaymentModal
        booking={selectedBookingForPayment}
        isOpen={isAddPaymentOpen}
        onClose={() => {
          setIsAddPaymentOpen(false);
          setSelectedBookingForPayment(null);
        }}
        onPaymentAdded={handlePaymentAdded}
      />

      <WhatsAppShareModal
        booking={selectedBookingForWhatsApp}
        isOpen={isWhatsAppOpen}
        onClose={() => {
          setIsWhatsAppOpen(false);
          setSelectedBookingForWhatsApp(null);
        }}
      />

      <CheckoutModal
        booking={selectedBookingForCheckout}
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false);
          setSelectedBookingForCheckout(null);
        }}
        onCheckoutSuccess={handleCheckoutSuccess}
      />
    </div>
  );
}
