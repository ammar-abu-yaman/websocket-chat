'use client'

import { FormEvent, JSX, useCallback, useEffect, useRef, useState } from 'react'
import * as sio from 'socket.io-client'
import { Socket } from 'socket.io-client'

export default function Home() {
    const [username, setUsername] = useState<string | null>(null)
    const dialogRef = useRef<HTMLDialogElement>(null)

    const handleUsernameFormSubmit = (evt: FormEvent) => {
        evt.preventDefault()
        // @ts-ignore
        const formData = new FormData(evt.target)
        const username = formData.get('username') as string
        setUsername(username)
        dialogRef?.current?.close()
    }


    useEffect(() => {
        if(!username) {
            dialogRef?.current?.showModal();
        }
    }, [username])

    return (
        <div>
            <dialog ref={dialogRef}>
                <h3>Type in username</h3>
                <form onSubmit={handleUsernameFormSubmit}>
                    <input required name="username"/>
                    <button type="submit">Submit</button>
                </form>
            </dialog>
            {!isBlank(username) ? <ChatRoom username={username as string} /> : <></>}
        </div>
    )
}

function ChatRoom({ username }: { username: string }): JSX.Element {
    const [room, setRoom] = useState<string>('')
    const [messages, setMessages] = useState<Message[]>([])

    const addMessageToList = (message: Message) => {
        if (isBlank(message.username) || isBlank(message.message)) {
            return
        }
        setMessages((messages) => [...messages, message])
    }

    const handleCurrentMessages = (messages: Message[])  => {
        const firstMessage: Message = {
            username: 'SERVER',
            message: `Connected to room [${room}] as user [${username}]`
        }
        setMessages([firstMessage, ...messages])
    }
    const handleReceiveMessage = (message: Message) => addMessageToList(message)

    const {isConnected, emitEvent} = useSocket(username, room, {
        baseUrl: 'http://localhost:8081',
        namespace: 'chat',
        eventHandlerMap: {
            'current-messages': handleCurrentMessages,
            'receive-message': handleReceiveMessage,
        },
    });

    const changeRoom = (evt: FormEvent) => {
        evt.preventDefault()
        // @ts-ignore
        const formData = new FormData(evt.target)
        const room = formData.get('room') as string
        setRoom(room)
    }

    const sendMessage = (evt: FormEvent) => {
        evt.preventDefault()
        // @ts-ignore
        const formData = new FormData(evt.target)
        const message: Message = {
            username,
            message: formData.get('message') as string,
        }
        emitEvent('send-message', message)
        addMessageToList(message)
    }

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
            <br />
            <div>
                <form onSubmit={changeRoom}>
                    <input required name="room" type="room"/>
                    <button type="submit">Change room</button>
                </form>
            </div>
            <br />
            <div>
                <form onSubmit={sendMessage}>
                    <input name="message" type="text" />
                    <button disabled={!isConnected}>Send</button>
                </form>
            </div>
        </div>
    )
}

type Message = {
    username: string
    message: string
}

export type SocketOptions = {
    baseUrl: string,
    namespace?: string,
    eventHandlerMap?: { [key: string]: (...args: any) => any },
}

function useSocket(username: string | null, room: string | null, options: SocketOptions) {

    const [socket, setSocket] = useState<Socket>()
    const [isConnected, setConnected] = useState<boolean>(false)

    const emitEvent = useCallback((name: string, args: any) => socket?.emit(name, args), [socket])

    useEffect(() => {
        if(isBlank(username) || room ?.length == 0) {
            return () => {};
        }
        const freshSocket = sio.io(`${options.baseUrl}/${options.namespace}`, {
            query: {
                username,
                room,
            }
        })
        setSocket(freshSocket)
        freshSocket.on("connect", () => setConnected(true));
        freshSocket.on("connect_error", error => {
            console.error("Couldn't connect to socket:", error);
        });

        // @ts-ignore
        for(const [event, handler] of Object.entries(options.eventHandlerMap)) {
            freshSocket.on(event, handler)
        }

        return () => {
            freshSocket.disconnect()
        }
    }, [username, room, options.baseUrl, options.namespace])

    return { isConnected, emitEvent }
}

function isBlank(str: string | null | undefined) {
    return (!str || /^\s*$/.test(str));
}