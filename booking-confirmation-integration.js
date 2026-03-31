/* ══════════════════════════════════════════════════════════════
   HOW TO LINK EACH SERVICE TO booking-confirmation.html
   ══════════════════════════════════════════════════════════════
   Replace each service's "Book Now / Reserve Room / Select" button
   onclick with the snippet below. The page auto-detects the service
   from the URL params passed in.
   ══════════════════════════════════════════════════════════════ */


/* ─────────────────────────────────────────
   1. HOTEL & HOMES  (hotel-results.js)
   Find the "Reserve Room" / book button and replace its onclick:
   ───────────────────────────────────────── */
function goToHotelBooking(hotel) {
    const params = new URLSearchParams({
        service:    'hotel',
        name:       hotel.name,
        city:       hotel.city,
        country:    hotel.country || 'Philippines',
        checkin:    document.querySelector('#panel-hotel input[type=date]:first-of-type')?.value || '',
        checkout:   document.querySelector('#panel-hotel input[type=date]:last-of-type')?.value  || '',
        nights:     hotel.nights     || 1,
        guests:     hotel.guests     || '2 Adults',
        rooms:      hotel.rooms      || 1,
        room_type:  hotel.room_type  || 'Standard Room',
        stars:      hotel.stars      || '',
        price:      hotel.price_per_night || hotel.price || 0,
    });
    window.location.href = 'booking-confirmation.html?' + params.toString();
}
// Usage in your hotel card HTML:
// <button onclick="goToHotelBooking(hotel)">Reserve Room</button>


/* ─────────────────────────────────────────
   2. FLIGHTS  (flight-results.js)
   Replace the existing "Book" button onclick:
   ───────────────────────────────────────── */
function goToFlightBooking(flight) {
    const params = new URLSearchParams({
        service:          'flights',
        airline:          flight.airline_name,
        flight_number:    flight.flight_number,
        origin:           flight.origin,
        origin_name:      flight.origin_name,
        destination:      flight.destination,
        destination_name: flight.destination_name,
        depart_time:      flight.depart_time,
        arrive_time:      flight.arrive_time,
        duration:         flight.duration,
        cabin:            'Economy',
        price:            flight.price,
        adults:           document.getElementById('paxAdults')?.textContent    || 1,
        children:         document.getElementById('paxChildren')?.textContent  || 0,
    });
    window.location.href = 'booking-confirmation.html?' + params.toString();
}
// Usage in your flight card HTML:
// <button onclick="goToFlightBooking(flight)">Book Flight</button>


/* ─────────────────────────────────────────
   3. CAR RENTAL  (car-rental.html inline script)
   Replace the existing goToCarBooking() function:
   ───────────────────────────────────────── */
function goToCarBooking() {
    const c = _currentModalCar;
    if (!c) return;
    const params = new URLSearchParams({
        service:   'car',
        id:        c.id,
        name:      c.car_name,
        brand:     c.brand,
        category:  c.category,
        trans:     c.transmission,
        fuel:      c.fuel_type,
        seats:     c.seats,
        doors:     c.doors,
        luggage:   c.luggage_capacity,
        rating:    c.rating,
        reviews:   c.reviews,
        price:     c.rent_per_day,
        days:      c.rental_days,
        image:     c.car_image,
    });
    window.location.href = 'booking-confirmation.html?' + params.toString();
}
// ↑ Already called from carmodal-book-btn. Just replace the function body.


/* ─────────────────────────────────────────
   4. ATTRACTIONS & TOURS  (attractions.html inline script)
   Replace the existing goToAttBooking() function:
   ───────────────────────────────────────── */
function goToAttBooking() {
    const a = ATT_DATA.find(x => x.id === attmCurrentId);
    if (!a) return;
    const disc = Math.round(a.price * 0.85);
    const params = new URLSearchParams({
        service:      'attractions',
        id:           a.id,
        name:         a.name,
        city:         a.city,
        country:      a.country,
        location:     a.location,
        category:     a.category,
        duration:     a.duration,
        price:        disc,
        rating:       a.rating,
        reviews:      a.reviews,
        instant:      a.instant      ? '1' : '0',
        cancel:       a.is_free_cancellation ? '1' : '0',
        participants: document.getElementById('attractionsPassengerLabel')?.textContent || '1 Adult',
    });
    window.location.href = 'booking-confirmation.html?' + params.toString();
}
// ↑ Already called from attm-book-btn. Just replace the function body.


/* ─────────────────────────────────────────
   5. AIRPORT TAXIS  (airport-taxis.html)
   The taxi page already goes to taxi-booking.html.
   Option A: Point it directly to booking-confirmation.html instead.
   Replace selectAirport() in airport-taxis.html:
   ───────────────────────────────────────── */
window.selectAirport = function (iata, city, terminal) {
    const pickup   = terminal ? `${city} – Terminal ${terminal} (${iata})` : `${city} (${iata})`;
    const dropoff  = (document.getElementById('taxi-dropoff')?.value || '').trim();
    const dateVal  = document.querySelector('#panel-taxi input[type="date"]')?.value || '';
    const timeVal  = document.querySelector('#panel-taxi .time-picker')?.value       || '';
    const adults   = document.getElementById('taxiAdults')?.textContent    || '1';
    const children = document.getElementById('taxiChildren')?.textContent  || '0';

    const params = new URLSearchParams({
        service:       'taxi',
        iata,  city,
        terminal:      terminal || '',
        pickup,
        dropoff:       dropoff  || 'Your destination',
        date:          dateVal,
        time:          timeVal,
        adults,  children,
        vehicle_name:  'Comfort',   // default; update if user chose a vehicle first
        vehicle_price: '1800',
    });
    window.location.href = 'booking-confirmation.html?' + params.toString();
};