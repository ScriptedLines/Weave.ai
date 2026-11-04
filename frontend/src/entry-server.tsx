import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AppRoutes } from './App'

export function render(url: string) {
  return renderToString(
    <AuthProvider>
      <StaticRouter location={url}>
        <AppRoutes />
      </StaticRouter>
    </AuthProvider>
  )
}
