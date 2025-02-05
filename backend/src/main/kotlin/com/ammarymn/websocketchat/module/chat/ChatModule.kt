package com.ammarymn.websocketchat.module.chat

import com.corundumstudio.socketio.SocketIOServer
import com.corundumstudio.socketio.listener.ConnectListener
import com.corundumstudio.socketio.listener.DataListener
import com.corundumstudio.socketio.listener.DisconnectListener
import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonProperty
import org.springframework.stereotype.Component
import java.util.concurrent.ConcurrentHashMap

@Component
class ChatModule(val server: SocketIOServer) {

    private val namespace = server.addNamespace("/chat")

    private val roomsToMessages = ConcurrentHashMap<String, MutableList<String>>()

    init {
        namespace.addConnectListener(onConnect())
        namespace.addDisconnectListener(onDisconnect())
        namespace.addEventListener("send-message", Message::class.java, onMessageReceived())
    }

    private fun onConnect() = ConnectListener { client ->
        val username = client.handshakeData.urlParams["username"]?.getOrNull(0) ?: ""
        val room = client.handshakeData.urlParams["room"]?.getOrNull(0) ?: ""
        client.sendEvent("receive-message", Message(
            username, "Connected using ID: ${client.sessionId}"
        ))
        client.sendEvent("current-messages", room)
    }

    private fun onDisconnect() = DisconnectListener {}

    private fun onMessageReceived() = DataListener<Message> { client, message, _ ->
        client.namespace.broadcastOperations.sendEvent("receive-message", client, message)
    }

}

data class Message @JsonCreator constructor(
    @JsonProperty("username") val username: String,
    @JsonProperty("message") val message: String
)