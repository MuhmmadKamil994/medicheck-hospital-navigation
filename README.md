##What is this project

This is my final year project for BS Information Technology. 
The idea came from a real problem i noticed around me. 
When people feel sick they dont know if they should go 
to emergency room or just see a normal doctor. Also 
finding a nearby hospital that accepts your insurance 
is very difficult in Pakistan.

So i built this web app to solve that problem.

## How it works

User opens the app and enters their symptoms like 
fever, headache, chest pain etc. The app uses AI to 
analyze those symptoms and tells the user what condition 
they might have. It also tells them how serious it is 
in three levels:

- Red: Go to Emergency Room immediately
- Yellow: See a doctor within 24 hours  
- Green: Book a normal GP appointment

After that the app shows nearby hospitals and clinics 
on a Google Map. User can filter by distance, specialty, 
insurance provider and whether the hospital is open right 
now. They can also book an appointment directly from the app.

## Main Features

- Symptom input form with guided questions
- AI based condition suggestions with urgency levels
- Interactive hospital map with filters
- Online appointment booking
- Insurance compatibility checker
- User dashboard with appointment history

## Tech Stack

- Frontend: React.js with Tailwind CSS
- Backend: Node.js and Express.js
- Database: Mogodb
- AI Integration: OpenAI API
- Map: Google Maps API
- Authentication: JWT
- Notifications: Twilio SMS

## How to run locally

First clone the repo:
git clone https://github.com/MuhammadKamil994/medicheck-hospital-navigation

Then setup backend:
cd server
npm install
create .env file and add your keys
npm start

Then setup frontend:
cd client
npm install
npm run dev

Open browser and go to:
http://localhost:5173

## Project Status

Currently under development as final year project.
Basic UI and authentication are done. AI integration 
and map features are in progress.

## Student Info

Name: Muhammad Kamil
Roll Number: S23BINFT1M01144
Department: Information Technology
University: The Islamia University of Bahawalpur, Bahawalpur
Session: 2023-2027
Supervisor: Mr Karim Nawaz sb.
