/* ================================================================
   PATCH for "hotel & homes.html"
   
   The problem: service-panels.js builds its OWN modal with a 
   "Reserve Room" button that calls window.location.href to go to
   hotel-booking.html. BUT the inline script in hotel & homes.html
   also has onReserveRoom() with an alert() — and the hotel-modal
   in hotel & homes.html (the OTHER modal defined in that file's
   HTML) calls onReserveRoom() directly.
   
   TWO modals exist:
   1. The one in hotel & homes.html (uses onReserveRoom → alert)
   2. The one in service-panels.js (uses buildBookingUrl → redirect)
   
   The hotel & homes.html modal is what shows when you click
   "Check Availability" on a hotel card — because service-panels.js
   calls showHotelModal() which is defined INSIDE service-panels.js.
   But the reserve button inside THAT modal calls:
       onclick="window.location.href='${bookingUrl}'"
   So it SHOULD redirect. 
   
   The alert appears because hotel & homes.html has a SECOND modal
   system (hotelModalBackdrop) triggered by openHotelModal() in its
   inline script, and the "Check Availability" button in the 
   rendered hotel cards calls onCheckAvail() → requireAuth() → 
   openHotelModal() → which opens the INLINE modal, whose Reserve
   button calls onReserveRoom() → alert().
   
   FIX: Replace onReserveRoom() to redirect to hotel-booking.html
   just like service-panels.js does, using the current hotel data.
================================================================ */

// ── PATCH: Replace onReserveRoom to redirect instead of alert ──
// Add this AFTER all other script tags in hotel & homes.html

window.onReserveRoom = function(event, roomName, price) {
    event.stopPropagation();

    window.requireAuth(function() {
        // Find the currently open hotel
        var hotel = null;
        if (typeof _currentHotelId !== 'undefined' && typeof _allHotels !== 'undefined') {
            hotel = _allHotels.find(function(h) { return h.id === _currentHotelId; });
        }
        if (!hotel) return;

        // Build URL exactly like service-panels.js does
        var params = new URLSearchParams();
        params.set('hotel',   hotel.name);
        params.set('city',    hotel.city    || '');
        params.set('address', hotel.city    || '');   // hotel data has no address field
        params.set('price',   price);
        params.set('rating',  hotel.rating  || '0');
        params.set('stars',   hotel.stars   || '0');
        params.set('reviews', hotel.reviews || '0');
        params.set('room',    roomName);
        params.set('score',   hotel.rating  || '7.5');

        // Pass check-in/check-out from the search bar if filled
        var pickers = document.querySelectorAll('.date-picker');
        var checkIn  = pickers[0] ? (pickers[0]._flatpickr ? pickers[0]._flatpickr.input.value : pickers[0].value) : '';
        var checkOut = pickers[1] ? (pickers[1]._flatpickr ? pickers[1]._flatpickr.input.value : pickers[1].value) : '';
        if (checkIn)  params.set('checkin',  checkIn);
        if (checkOut) params.set('checkout', checkOut);

        // Calculate nights
        var nights = 1;
        if (checkIn && checkOut) {
            var diff = Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000);
            if (diff > 0) nights = diff;
        }
        params.set('nights', nights);

        // Guests/rooms from hotelOcc global
        var occ = (typeof hotelOcc !== 'undefined') ? hotelOcc : { adults: 2, children: 0, rooms: 1 };
        params.set('guests', occ.adults + occ.children);
        params.set('rooms',  occ.rooms);

        window.location.href = 'hotel-booking.html?' + params.toString();

    }, 'Sign in to reserve a room');
};