import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'io.github.manfug.quantapit',
  appName: 'QuantaPit',
  webDir: 'dist',
  server: { hostname: 'localhost', androidScheme: 'https' },
  android: { backgroundColor: '#24182f', minWebViewVersion: 119 },
  plugins: { SystemBars: { insetsHandling: 'disable', style: 'DARK' } },
}

export default config
