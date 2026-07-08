import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Bu makinede proje klasörünün dışında (kullanıcı ana dizininde) başka bir
  // package-lock.json bulunduğu için Turbopack'in kök dizini yanlış
  // algılamasını önlemek amacıyla açıkça belirtiyoruz.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
