import {
  Component,
  Inject,
  PLATFORM_ID,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { BookingService } from '../../../services/booking.service';
import { Booking, BookingStatus } from '../../../models/booking.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tranaction-hitory',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tranaction-hitory.component.html',
  styleUrl: './tranaction-hitory.component.css',
})
export class TranactionHitoryComponent implements OnInit, OnDestroy {
  isViewModalOpen = false;
  isFeedbackModalOpen = false;
  isCancelModalOpen = false;
  currentRating = 0;
  ratingTexts = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
  bookings: Booking[] = [];
  filteredBookings: Booking[] = [];
  currentFilter: string = 'all';
  isLoading = true;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  selectedBooking: Booking | null = null;
  bookingToCancel: Booking | null = null;
  isCancelling = false;

  private isBrowser: boolean;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private bookingService: BookingService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.loadBookings();

    // Add event listener for when the page becomes visible (user navigates back)
    if (this.isBrowser) {
      document.addEventListener(
        'visibilitychange',
        this.handleVisibilityChange.bind(this)
      );
    }
  }

  ngOnDestroy(): void {
    if (this.isBrowser) {
      document.removeEventListener(
        'visibilitychange',
        this.handleVisibilityChange.bind(this)
      );
    }
  }

  private handleVisibilityChange(): void {
    if (!document.hidden) {
      // Page became visible, refresh data to ensure consistency
      console.log('Page became visible, refreshing bookings...');
      this.loadBookings();
    }
  }

  setFilter(filter: string): void {
    this.currentFilter = filter;
    this.applyFilter();
  }

  applyFilter(): void {
    if (this.currentFilter === 'all') {
      this.filteredBookings = this.bookings;
    } else {
      this.filteredBookings = this.bookings.filter((booking) => {
        const normalized = this.normalizeStatus(booking.status);
        return normalized === this.currentFilter;
      });
    }
  }

  displayStatus(status: string): string {
    const raw = (status ?? '').toString().trim();
    if (!raw) return 'pending';
    const s = this.normalizeStatus(raw);
    return s || 'pending';
  }

  normalizeStatus(
    status: string
  ): 'pending' | 'approved' | 'completed' | 'cancelled' | 'rejected' | string {
    const s = (status ?? '').toString().trim().toLowerCase();
    if (s === 'confirmed' || s === 'approved') return 'approved';
    if (s === 'cancelled' || s === 'canceled') return 'cancelled';
    if (s === 'completed' || s === 'complete') return 'completed';
    if (s === 'pending') return 'pending';
    return s;
  }

  loadBookings(): void {
    if (this.isBrowser) {
      console.log('Loading bookings...');

      // Check if customer is logged in
      const customerData = localStorage.getItem('customer_data');
      console.log('Customer data from localStorage:', customerData);

      if (customerData) {
        try {
          const customer = JSON.parse(customerData);
          const customerId = customer.id;
          console.log('Customer ID:', customerId);

          if (customerId) {
            this.isLoading = true;
            this.errorMessage = null;

            this.bookingService.getBookingsByCustomerId(customerId).subscribe({
              next: (bookings) => {
                console.log('Bookings received from backend:', bookings);

                // Sort bookings by washDate and washTime descending (newest first)
                this.bookings = bookings.sort((a: any, b: any) => {
                  const dateA = new Date(
                    a.washDate + 'T' + (a.washTime || '00:00:00')
                  );
                  const dateB = new Date(
                    b.washDate + 'T' + (b.washTime || '00:00:00')
                  );
                  return dateB.getTime() - dateA.getTime();
                });

                this.applyFilter();
                this.isLoading = false;
                console.log(
                  'Bookings loaded successfully:',
                  this.bookings.length
                );

                // Log each booking status for debugging
                this.bookings.forEach((booking, index) => {
                  console.log(
                    `Booking ${index + 1}: ID=${booking.id}, Status=${
                      booking.status
                    }, Service=${booking.serviceName}`
                  );
                });
              },
              error: (error) => {
                console.error('Error loading bookings:', error);
                this.errorMessage = `Failed to load bookings: ${error.message}`;
                this.isLoading = false;
              },
            });
          } else {
            console.error('Customer ID not found in customer data');
            this.errorMessage = 'Customer ID not found. Please log in again.';
            this.isLoading = false;
          }
        } catch (error) {
          console.error('Error parsing customer data:', error);
          this.errorMessage = 'Invalid customer data. Please log in again.';
          this.isLoading = false;
        }
      } else {
        console.log('No customer data found in localStorage');
        this.errorMessage =
          'You must be logged in to view your transaction history.';
        this.isLoading = false;
      }
    }
  }

  openViewModal(booking: Booking): void {
    this.selectedBooking = booking;
    console.log('Opening view modal');
    this.isViewModalOpen = true;
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
    }
  }

  closeViewModal(): void {
    console.log('Closing view modal');
    this.isViewModalOpen = false;
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = ''; // Restore scrolling
    }
  }

  openFeedbackModal(): void {
    console.log('Opening feedback modal');
    this.isFeedbackModalOpen = true;
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'hidden';
    }
  }

  closeFeedbackModal(): void {
    console.log('Closing feedback modal');
    this.isFeedbackModalOpen = false;
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }

  openCancelModal(booking: Booking): void {
    this.bookingToCancel = booking;
    this.isCancelModalOpen = true;
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'hidden';
    }
  }

  closeCancelModal(): void {
    this.isCancelModalOpen = false;
    this.bookingToCancel = null;
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }

  async cancelBooking(): Promise<void> {
    if (!this.bookingToCancel) return;

    this.isCancelling = true;
    try {
      console.log('🚀 Starting cancellation process...');
      console.log('📋 Booking to cancel:', this.bookingToCancel);
      console.log('🆔 Booking ID:', this.bookingToCancel.id);
      console.log('📝 Current Status:', this.bookingToCancel.status);

      const result = await this.bookingService
        .updateBookingStatus(this.bookingToCancel.id, 'Cancelled')
        .toPromise();

      console.log('📡 Backend response:', result);

      // Check if the update was successful
      if (result && result.success) {
        console.log('✅ Backend update successful');

        // Close modal first
        this.closeCancelModal();

        // Set success message
        this.successMessage =
          result.message || 'Booking cancelled successfully!';
        this.errorMessage = null;

        console.log('🎉 Booking cancelled successfully:', result.message);

        // Reload data from backend to ensure consistency
        console.log('🔄 Reloading data from backend...');
        await this.loadBookings();
        console.log('✅ Data reloaded from backend');
      } else {
        console.log('❌ Backend update failed:', result);
        throw new Error('Failed to cancel booking');
      }
    } catch (error) {
      console.error('💥 Error cancelling booking:', error);
      this.errorMessage = 'Failed to cancel booking. Please try again.';
      this.successMessage = null;
    } finally {
      this.isCancelling = false;
    }
  }

  canCancelBooking(booking: Booking): boolean {
    return this.normalizeStatus(booking.status) === 'pending';
  }

  clearSuccessMessage(): void {
    this.successMessage = null;
  }

  setRating(rating: number): void {
    console.log('Setting rating to:', rating);
    this.currentRating = rating;
  }

  getRatingText(): string {
    return this.currentRating > 0 ? this.ratingTexts[this.currentRating] : '';
  }

  // New methods for enhanced UI
  getFilterCount(filter: string): number {
    if (filter === 'all') {
      return this.bookings.length;
    }
    return this.bookings.filter((booking) => {
      const normalized = this.normalizeStatus(booking.status);
      return normalized === filter;
    }).length;
  }

  trackByBooking(index: number, booking: Booking): string | number {
    return booking.id;
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'completed':
        return '🎉';
      case 'approved':
        return '✅';
      case 'pending':
        return '⏳';
      case 'cancelled':
        return '❌';
      case 'rejected':
        return '❌';
      default:
        return '📋';
    }
  }

  getStatusDescription(status: string): string {
    switch (status) {
      case 'completed':
        return 'Your car wash service has been completed successfully!';
      case 'approved':
        return 'Your booking has been approved and is being processed.';
      case 'pending':
        return 'Your booking is currently under review.';
      case 'cancelled':
        return 'This booking has been cancelled.';
      case 'rejected':
        return 'This booking has been rejected.';
      default:
        return 'Your booking status is being updated.';
    }
  }

  formatTime(time: string): string {
    if (!time) return '';

    try {
      // Handle different time formats
      let timeStr = time.toString().trim();

      // If it's already in 12-hour format, return as is
      if (
        timeStr.toLowerCase().includes('am') ||
        timeStr.toLowerCase().includes('pm')
      ) {
        return timeStr;
      }

      // If it's in 24-hour format (HH:MM:SS or HH:MM), convert to 12-hour
      if (timeStr.includes(':')) {
        const [hours, minutes] = timeStr.split(':');
        const hour = parseInt(hours, 10);
        const minute = parseInt(minutes, 10);

        if (isNaN(hour) || isNaN(minute)) {
          return timeStr; // Return original if parsing fails
        }

        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const displayMinute = minute.toString().padStart(2, '0');

        return `${displayHour}:${displayMinute}${period}`;
      }

      return timeStr; // Return original if no recognizable format
    } catch (error) {
      console.error('Error formatting time:', error);
      return time; // Return original if any error occurs
    }
  }

  getUserInitials(name: string): string {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getEmployeeInfo(booking: any): string {
    if (
      booking.assigned_employee_id &&
      booking.employee_first_name &&
      booking.employee_last_name
    ) {
      const employeeName = `${booking.employee_first_name} ${booking.employee_last_name}`;
      if (booking.employee_position) {
        return `${employeeName} (${booking.employee_position})`;
      }
      return employeeName;
    }
    return 'Pending Assignment';
  }

  hasEmployeeAssigned(booking: any): boolean {
    return !!(
      booking.assigned_employee_id &&
      booking.employee_first_name &&
      booking.employee_last_name
    );
  }
}
