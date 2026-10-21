// Shop rules shared by the server. Edit the numbers here to change them.

// Smallest order a customer can place, in JD (counted before any promo code).
// This is fixed in code on purpose: an old MIN_ORDER_JD value left in a server's
// .env file can no longer override it.
const MIN_ORDER_JD = 5;

// Delivery is free when the total the customer pays reaches this amount, in JD.
const FREE_DELIVERY_JD = parseFloat(process.env.FREE_DELIVERY_JD || '30');

module.exports = { MIN_ORDER_JD, FREE_DELIVERY_JD };
