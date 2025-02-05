import type { Metadata } from 'next'
import '@/styles/globals.scss'
import Navbar from '@/app/_components/layout/Navbar'
import MainContainer from '@/app/_components/layout/MainContainer'

export const metadata: Metadata = {
    title: 'Websocket chat app',
    description: 'Chat application utilizing websockets',
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en">
            <body>
                <Navbar />
                <MainContainer>{children}</MainContainer>
            </body>
        </html>
    )
}
