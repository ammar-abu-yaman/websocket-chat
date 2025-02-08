package com.ammarymn.websocketchat.module.chat

import com.corundumstudio.socketio.SocketIOServer
import com.corundumstudio.socketio.listener.ConnectListener
import com.corundumstudio.socketio.listener.DataListener
import com.corundumstudio.socketio.listener.DisconnectListener
import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonProperty
import org.springframework.stereotype.Component
import java.util.Collections
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ConcurrentMap

@Component
class ChatModule(val server: SocketIOServer) {

    private val namespace = server.addNamespace("/chat")

    private val roomsToMessages: ConcurrentMap<String, MutableList<Message>> = ConcurrentHashMap()

    init {
        namespace.addConnectListener(onConnect())
        namespace.addDisconnectListener(onDisconnect())
        namespace.addEventListener("send-message", Message::class.java, onMessageReceived())
    }

    private fun onConnect() = ConnectListener { client ->
        val username = client.handshakeData.getSingleUrlParam("username")
        val room = client.handshakeData.getSingleUrlParam("room")
        println("joining $username to $room")
        client.joinRoom(room)
        val messages = roomsToMessages.computeIfAbsent(room) { Collections.synchronizedList(ArrayList<Message>()) }
        client.sendEvent("current-messages", messages)
    }

    private fun onDisconnect() = DisconnectListener {}

    private fun onMessageReceived() = DataListener<Message> { client, request, _ ->
        val (username, message) = request
        val room = client.allRooms.lastOrNull() ?: return@DataListener
        val roomMessages = roomsToMessages[room] ?: return@DataListener
        roomMessages.add(Message(username, message))

        client.namespace
            .getRoomOperations(room)
            .sendEvent("receive-message", client, Message(username, message))
    }
}

data class Message @JsonCreator constructor(
    @JsonProperty("username") val username: String,
    @JsonProperty("message") val message: String
)