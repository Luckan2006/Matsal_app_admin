import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import './admin.css'

function App() {
  const [days, setDays] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchWeek = async () => {
      setLoading(true)
      setError(null)

      const today = new Date()
      const since = new Date()
      since.setDate(today.getDate() - 6)
      const sinceStr = since.toISOString().slice(0, 10)

      const { data, error } = await supabase
        .from('daily_clicks')
        .select('*')
        .gte('day', sinceStr)
        .order('day', { ascending: true })

      if (error) setError('Kunde inte hämta veckodatan')
      else setDays(data || [])

      setLoading(false)
    }

    fetchWeek()
  }, [])

  if (loading) return <h1>Laddar...</h1>
  if (error) return <h1>{error}</h1>

  return (
    <div className="admin">
      <h1>Veckosammanställning</h1>
      <table>
        <thead>
          <tr>
            <th>Datum</th>
            <th>Hann inte äta</th>
            <th>Tog för mycket</th>
            <th>Ogillade maten</th>
            <th>Slängde inte</th>
          </tr>
        </thead>
        <tbody>
          {days.map((row) => (
            <tr key={row.day}>
              <td>{row.day}</td>
              <td>{row.one}</td>
              <td>{row.two}</td>
              <td>{row.three}</td>
              <td>{row.four}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default App
