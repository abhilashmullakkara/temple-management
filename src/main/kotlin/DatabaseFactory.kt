package com.example

import org.jetbrains.exposed.v1.jdbc.Database

object DatabaseFactory {

    fun init() {

        val host = System.getenv("DB_HOST") ?: "127.0.0.1"
        val port = System.getenv("DB_PORT") ?: "5432"
        val database = System.getenv("DB_NAME") ?: "temple_management"
        val user = System.getenv("DB_USER") ?: "temple_app"
        val password = System.getenv("DB_PASSWORD")
            ?: error("DB_PASSWORD is not configured")

        val jdbcUrl =
            "jdbc:postgresql://$host:$port/$database"

        Database.connect(
            url = jdbcUrl,
            driver = "org.postgresql.Driver",
            user = user,
            password = password
        )

        println("PostgreSQL connection configured successfully.")
    }
}
