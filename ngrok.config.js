/**
 * Ngrok Configuration File
 * 
 * This file configures ngrok to expose your local Next.js application to the internet.
 * For more configuration options, see: https://ngrok.com/docs/ngrok-agent/config/
 */

module.exports = {
  // The port your Next.js app is running on
  addr: 3000,
  
  // The region to use (choose the closest to your location)
  // Options: us, eu, ap, au, sa, jp, in
  region: 'us',
  
  // Your ngrok authtoken (required)
  // Get this from https://dashboard.ngrok.com/get-started/your-authtoken
  authtoken: '2yRLbA048g0egdv9MROooGZ0RwB_cTMQydzqpkDsvgJEajB1',
  
  // Optional: Request a specific subdomain (requires paid plan)
  // subdomain: 'manhwa-recommendation',
  
  // Optional: Add basic auth protection
  // auth: 'username:password',
  
  // Optional: Set a custom hostname (requires paid plan)
  // hostname: 'example.ngrok.io',
};
