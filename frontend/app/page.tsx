'use client'

import { JSX, useCallback, useEffect, useState } from 'react'
import * as sio from 'socket.io-client'
import { Socket } from 'socket.io-client'

const USER_NAME = crypto.randomUUID()

export default function Home() {
    return (
        <div>
            <ChatRoom username={USER_NAME} />
        </div>
    )
}

function ChatRoom({ username }: { username: string }): JSX.Element {
    const [room, setRoom] = useState<string | null>(null)
    const { socketResponse, isConnected, sendMessage } = useSocket(username)
    const [messages, setMessages] = useState<Payload[]>([])
    const [message, setMessage] = useState('')

    const addMessageToList = (message: Payload) => {
        if (!message?.username || !message.message) {
            return
        }
        setMessages((messages) => [...messages, message])
    }

    const send = () => {
        sendMessage({
            username,
            message,
        })
        addMessageToList({ username, message })
        setMessage('')
    }

    useEffect(() => addMessageToList(socketResponse), [socketResponse])

    return (
        <div>
            {messages.map(({ username, message }, id) => (
                <div key={id}>
                    <div>
                        {username}: {message}
                    </div>
                    <br />
                </div>
            ))}
            <div>
                <input name="message" type="text" value={message} onChange={(evt) => setMessage(evt.target.value)} />
                <button disabled={!isConnected} onClick={send}>Send</button>
            </div>
        </div>
    )
}

type Payload = {
    username?: string
    message?: string
}

function useSocket(username: string) {
    const [socket, setSocket] = useState<Socket>()
    const [isConnected, setConnected] = useState<boolean>(false)
    const [socketResponse, setSocketResponse] = useState<Payload>({
        username: undefined,
        message: undefined,
    })

    const sendMessage = useCallback((payload: Payload) => socket?.emit('send-message', payload), [socket])

    useEffect(() => {
        const socketBaseUrl = 'http://localhost:8081' //`${window.location.origin}/api`
        const socket = sio.io(`${socketBaseUrl}/chat`, {
            query: {
                username,
            },
        })
        setSocket(socket)
        socket.on('connect', () => {
            setConnected(true)
        })
        socket.on('connect_error', (error) => {
            console.error('SOCKET CONNECTION ERROR', error)
        })
        socket.on('receive-message', (payload: Payload) => setSocketResponse(payload))

        return () => {
            socket.disconnect()
        }
    }, [username])

    return { socketResponse, isConnected, sendMessage }
}
