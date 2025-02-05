package com.ammarymn.websocketchat.config

import com.corundumstudio.socketio.Configuration
import com.corundumstudio.socketio.SocketIOServer
import lombok.extern.log4j.Log4j2
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.stereotype.Component
import org.springframework.web.bind.annotation.CrossOrigin

@CrossOrigin
@org.springframework.context.annotation.Configuration
@Log4j2
class SocketIOConfig {
    @Value("\${socket.host}")
    private val SOCKET_HOST: String? = null

    @Value("\${socket.port}")
    private val SOCKET_PORT = 0

    @Bean
    fun socketIoServer(): SocketIOServer {
        val config = Configuration()
        config.hostname = SOCKET_HOST
        config.port = SOCKET_PORT
//        config.isEnableCors = true
//        config.origin = "http://localhost:3000"

        return SocketIOServer(config)
    }
}