import type { NextConfig } from "next";
import path from 'node:path'

const nextConfig: NextConfig = {
    output: 'standalone',
    sassOptions: {
        includePaths: [path.join(__dirname, 'styles')]
    }
};

export default nextConfig;
