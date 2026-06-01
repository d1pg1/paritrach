import createNextIntlPlugin from "next-intl/plugin"
import type { NextConfig } from "next"

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.24.177.1"],
}

export default withNextIntl(nextConfig)
