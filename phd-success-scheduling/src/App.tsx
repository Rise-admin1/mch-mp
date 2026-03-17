import { BookingPage } from './components/BookingPage'
import { Route, Routes } from 'react-router-dom'
import { PaymentFailPage } from '@/pages/PaymentFailPage'
import { PaymentSuccessPage } from '@/pages/PaymentSuccessPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<BookingPage />} />
      <Route path="/payment-success" element={<PaymentSuccessPage />} />
      <Route path="/payment-fail" element={<PaymentFailPage />} />
    </Routes>
  )
}

export default App
