import { Routes, Route } from 'react-router-dom'
import BookingPage from './pages/BookingPage'
import AdminPage from './pages/AdminPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<BookingPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  )
}

export default App
