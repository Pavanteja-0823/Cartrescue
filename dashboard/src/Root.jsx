// Root.jsx — shows the LandingPage first; "Get Started" enters the dashboard (App).
// A small "← Home" affordance lets you return to the intro.
import React, { useState } from 'react'
import LandingPage from './components/LandingPage.jsx'
import App from './App.jsx'

export default function Root() {
  const [entered, setEntered] = useState(false)
  if (!entered) return <LandingPage onStart={() => setEntered(true)} />
  return <App onHome={() => setEntered(false)} />
}
