package com.ammarymn.websocketchat.config

import com.corundumstudio.socketio.SocketIOServer
import jakarta.annotation.PreDestroy
import org.springframework.boot.CommandLineRunner
import org.springframework.stereotype.Component

@Component
class ServerCommandLineRunner(val server: SocketIOServer) : CommandLineRunner {

    override fun run(vararg args: String?) = server.start()

    @PreDestroy
    fun shutdown() = server.stop()
}