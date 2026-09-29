package com.example

import io.ktor.http.*
import io.ktor.server.http.content.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.cors.routing.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.plugins.statuspages.*
import kotlinx.serialization.Serializable
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.jetbrains.exposed.v1.jdbc.update
import java.math.BigDecimal



@Serializable
data class PoojaRecordResponse(
    val s_no: Long,
    val particulars: String,
    val other_particular: String?,
    val amount: String?,
    val transaction_date: String?,
    val devotee_name: String,
    val address: String?,
    val phone_number: String?
)


@Serializable
data class PoojaRecordRequest(
    val particulars: String,
    val other_particular: String?,
    val amount: String?,
    val devotee_name: String,
    val address: String?,
    val phone_number: String?
)

@Serializable
data class ExpenseResponse(
    val id: Long,
    val expense_date: String,
    val name_or_description: String,
    val amount: String
)

@Serializable
data class ExpenseRequest(
    val name_or_description: String,
    val amount: String
)

@Serializable
data class PoojaParticularResponse(
    val id: Long,
    val particulars: String,
    val amount: String
)

@Serializable
data class PoojaParticularUpdateRequest(
    val amount: String
)

@Serializable
data class PoojaCreateResponse(
    val s_no: Long,
    val message: String
)


@Serializable
data class ApiError(
    val message: String
)


@Serializable
data class ExpenseCreateResponse(
    val id: Long,
    val message: String
)

@Serializable
data class TodaySummaryResponse(
    val income: String,
    val expense: String
)



fun Application.configureRouting() {

    /*
     * Connect to PostgreSQL
     */
    DatabaseFactory.init()


    /*
     * Enable JSON
     */
    install(ContentNegotiation) {
        json()
    }


    /*
     * Error handling
     */
    install(StatusPages) {

        exception<Throwable> { call, cause ->

            cause.printStackTrace()

            call.respond(
                HttpStatusCode.InternalServerError,
                ApiError("Internal server error")
            )
        }
    }


    /*
     * Enable CORS
     */
    install(CORS) {

        anyHost()

        allowHeader(HttpHeaders.ContentType)
        allowHeader(HttpHeaders.Accept)

        allowMethod(HttpMethod.Get)
        allowMethod(HttpMethod.Post)
        allowMethod(HttpMethod.Put)
        allowMethod(HttpMethod.Delete)
    }


    routing {

        /*
         * Serve frontend
         */
        staticResources("/", "static")


        /*
         * GET /api/particulars
         *
         * Returns standard pooja particulars and their
         * current amounts from the database.
         */
        get("/api/particulars") {

            val particulars = transaction {

                PoojaParticulars
                    .selectAll()
                    .orderBy(
                        PoojaParticulars.id to SortOrder.ASC
                    )
                    .map { row ->

                        PoojaParticularResponse(
                            id = row[PoojaParticulars.id],
                            particulars =
                                row[PoojaParticulars.particulars],
                            amount =
                                row[PoojaParticulars.amount]
                                    .toPlainString()
                        )
                    }
            }

            call.respond(particulars)
        }




get("/api/today-summary") {

    val summary = transaction {

        val today =
            java.time.LocalDate.now()

        val totalIncome =
            PoojaRecords
                .selectAll()
                .where {
                    PoojaRecords.transactionDate eq today
                }
                .sumOf { row ->
                    row[PoojaRecords.amount]
                        ?: BigDecimal.ZERO
                }

        val totalExpense =
            Expenses
                .selectAll()
                .where {
                    Expenses.expenseDate eq today
                }
                .sumOf { row ->
                    row[Expenses.amount]
                }

        TodaySummaryResponse(
            income =
                totalIncome.toPlainString(),

            expense =
                totalExpense.toPlainString()
        )
    }

    call.respond(summary)
}


get("/api/expenses") {

    val expenses = transaction {

        Expenses
            .selectAll()
            .orderBy(
                Expenses.id,
                SortOrder.DESC
            )
            .map { row ->

                ExpenseResponse(
                    id =
                        row[Expenses.id],

                    expense_date =
                        row[Expenses.expenseDate]
                            .toString(),

                    name_or_description =
                        row[Expenses.nameOrDescription],

                    amount =
                        row[Expenses.amount]
                            .toPlainString()
                )
            }
    }

    call.respond(expenses)
}



post("/api/expenses") {

    val request =
        call.receive<ExpenseRequest>()

    if (request.name_or_description.isBlank()) {

        call.respond(
            HttpStatusCode.BadRequest,
            ApiError(
                "Name or description is required"
            )
        )

        return@post
    }

    val amount = try {

        BigDecimal(request.amount)

    } catch (e: Exception) {

        call.respond(
            HttpStatusCode.BadRequest,
            ApiError(
                "Invalid expense amount"
            )
        )

        return@post
    }

    if (amount < BigDecimal.ZERO) {

        call.respond(
            HttpStatusCode.BadRequest,
            ApiError(
                "Expense amount cannot be negative"
            )
        )

        return@post
    }

    val expenseId = transaction {

        Expenses.insert {

            it[Expenses.nameOrDescription] =
                request.name_or_description.trim()

            it[Expenses.amount] =
                amount
        }

        Expenses
            .selectAll()
            .orderBy(
                Expenses.id to SortOrder.DESC
            )
            .limit(1)
            .single()[Expenses.id]
    }

call.respond(
    HttpStatusCode.Created,
    ExpenseCreateResponse(
        id = expenseId,
        message = "Expense saved successfully"
    )
)
}
/*
 * PUT /api/particulars/{id}
 *
 * Updates the configured amount for a standard pooja.
 */
put("/api/particulars/{id}") {

    val id =
        call.parameters["id"]?.toLongOrNull()


    if (id == null) {

        call.respond(
            HttpStatusCode.BadRequest,
            ApiError("Invalid particular ID")
        )

        return@put
    }


    val request =
        call.receive<PoojaParticularUpdateRequest>()


    val newAmount =
        request.amount.toBigDecimalOrNull()


    if (newAmount == null) {

        call.respond(
            HttpStatusCode.BadRequest,
            ApiError("Invalid amount")
        )

        return@put
    }


    if (newAmount < BigDecimal.ZERO) {

        call.respond(
            HttpStatusCode.BadRequest,
            ApiError("Amount cannot be negative")
        )

        return@put
    }


    val updatedRows = transaction {

        PoojaParticulars.update(
            where = {
                PoojaParticulars.id eq id
            }
        ) {

            it[PoojaParticulars.amount] =
                newAmount
        }
    }


    if (updatedRows == 0) {

        call.respond(
            HttpStatusCode.NotFound,
            ApiError("Pooja particular not found")
        )

    } else {

        call.respond(
            HttpStatusCode.OK,
            ApiError(
                "Pooja amount updated successfully"
            )
        )
    }
}
        /*
         * GET /api/pooja
         *
         * Returns all pooja records.
         */
        get("/api/pooja") {

            val records = transaction {

               PoojaRecords
    		.selectAll()
    			.orderBy(PoojaRecords.sNo, SortOrder.DESC)
                    .map { row ->

                        PoojaRecordResponse(
                            s_no = row[PoojaRecords.sNo],

                            particulars =
                                row[PoojaRecords.particulars],

                            other_particular =
                                row[PoojaRecords.otherParticular],

                            amount =
                                row[PoojaRecords.amount]
                                    ?.toPlainString(),
                              
    			    transaction_date =
        			row[PoojaRecords.transactionDate]
            			?.toString(),      

                            devotee_name =
                                row[PoojaRecords.devoteeName],

                            address =
                                row[PoojaRecords.address],

                            phone_number =
                                row[PoojaRecords.phoneNumber]
                        )
                    }
            }

            call.respond(records)
        }


        /*
         * POST /api/pooja
         *
         * Creates a new pooja record.
         */
        post("/api/pooja") {

            val request =
                call.receive<PoojaRecordRequest>()


            val particulars =
                request.particulars.trim()


            /*
             * Validate particulars.
             */
            if (particulars.isBlank()) {

                call.respond(
                    HttpStatusCode.BadRequest,
                    ApiError("Particulars is required")
                )

                return@post
            }


            /*
             * Validate devotee name.
             */
            if (request.devotee_name.isBlank()) {

                call.respond(
                    HttpStatusCode.BadRequest,
                    ApiError("Devotee name is required")
                )

                return@post
            }


            /*
             * Determine the amount.
             *
             * Standard particulars:
             *     amount comes from pooja_particulars.
             *
             * Others:
             *     amount comes from the user.
             */
            val transactionAmount: BigDecimal
            val otherParticular: String?


            if (particulars == "Others") {

                otherParticular =
                    request.other_particular
                        ?.trim()


                if (otherParticular.isNullOrBlank()) {

                    call.respond(
                        HttpStatusCode.BadRequest,
                        ApiError(
                            "Please specify the other particular"
                        )
                    )

                    return@post
                }


                if (request.amount.isNullOrBlank()) {

                    call.respond(
                        HttpStatusCode.BadRequest,
                        ApiError(
                            "Amount is required for Others"
                        )
                    )

                    return@post
                }


                transactionAmount =
                    request.amount
                        .toBigDecimalOrNull()
                        ?: run {

                            call.respond(
                                HttpStatusCode.BadRequest,
                                ApiError(
                                    "Invalid amount"
                                )
                            )

                            return@post
                        }


                if (transactionAmount < BigDecimal.ZERO) {

                    call.respond(
                        HttpStatusCode.BadRequest,
                        ApiError(
                            "Amount cannot be negative"
                        )
                    )

                    return@post
                }

            } else {

                otherParticular = null


                transactionAmount =
                    transaction {

                        PoojaParticulars
                            .selectAll()
                            .where {
                                PoojaParticulars.particulars eq particulars
                            }
                            .singleOrNull()
                            ?.get(PoojaParticulars.amount)
                    }
                    ?: run {

                        call.respond(
                            HttpStatusCode.BadRequest,
                            ApiError(
                                "Unknown pooja particular"
                            )
                        )

                        return@post
                    }
            }


            /*
             * Insert transaction.
             */
            val newId = transaction {

                PoojaRecords.insert {

                    it[PoojaRecords.particulars] =
                        particulars

                    it[PoojaRecords.otherParticular] =
                        otherParticular

                    it[PoojaRecords.amount] =
                        transactionAmount

                    it[PoojaRecords.devoteeName] =
                        request.devotee_name.trim()

                    it[PoojaRecords.address] =
                        request.address

                    it[PoojaRecords.phoneNumber] =
                        request.phone_number
                }


                PoojaRecords
                    .selectAll()
                    .orderBy(
                        PoojaRecords.sNo to SortOrder.DESC
                    )
                    .limit(1)
                    .single()[PoojaRecords.sNo]
            }


            call.respond(
                HttpStatusCode.Created,

                PoojaCreateResponse(
                    s_no = newId,
                    message =
                        "Pooja record created successfully"
                )
            )
        }
        
        
        
        


        /*
         * PUT /api/pooja/{id}
         *
         * Updates an existing pooja record.
         */
        put("/api/pooja/{id}") {

            val id =
                call.parameters["id"]?.toLongOrNull()


            if (id == null) {

                call.respond(
                    HttpStatusCode.BadRequest,
                    ApiError("Invalid record ID")
                )

                return@put
            }


            val request =
                call.receive<PoojaRecordRequest>()


            val particulars =
                request.particulars.trim()


            /*
             * Validate particulars.
             */
            if (particulars.isBlank()) {

                call.respond(
                    HttpStatusCode.BadRequest,
                    ApiError("Particulars is required")
                )

                return@put
            }


            /*
             * Validate devotee name.
             */
            if (request.devotee_name.isBlank()) {

                call.respond(
                    HttpStatusCode.BadRequest,
                    ApiError("Devotee name is required")
                )

                return@put
            }


            /*
             * Determine amount.
             */
            val transactionAmount: BigDecimal
            val otherParticular: String?


            if (particulars == "Others") {

                otherParticular =
                    request.other_particular
                        ?.trim()


                if (otherParticular.isNullOrBlank()) {

                    call.respond(
                        HttpStatusCode.BadRequest,
                        ApiError(
                            "Please specify the other particular"
                        )
                    )

                    return@put
                }


                if (request.amount.isNullOrBlank()) {

                    call.respond(
                        HttpStatusCode.BadRequest,
                        ApiError(
                            "Amount is required for Others"
                        )
                    )

                    return@put
                }


                transactionAmount =
                    request.amount
                        .toBigDecimalOrNull()
                        ?: run {

                            call.respond(
                                HttpStatusCode.BadRequest,
                                ApiError("Invalid amount")
                            )

                            return@put
                        }


                if (transactionAmount < BigDecimal.ZERO) {

                    call.respond(
                        HttpStatusCode.BadRequest,
                        ApiError(
                            "Amount cannot be negative"
                        )
                    )

                    return@put
                }

            } else {

                otherParticular = null


                transactionAmount =
                    transaction {

                        PoojaParticulars
                            .selectAll()
                            .where {
                                PoojaParticulars.particulars eq particulars
                            }
                            .singleOrNull()
                            ?.get(PoojaParticulars.amount)
                    }
                    ?: run {

                        call.respond(
                            HttpStatusCode.BadRequest,
                            ApiError(
                                "Unknown pooja particular"
                            )
                        )

                        return@put
                    }
            }


            /*
             * Update record.
             */
            val updatedRows = transaction {

                PoojaRecords.update(
                    where = {
                        PoojaRecords.sNo eq id
                    }
                ) {

                    it[PoojaRecords.particulars] =
                        particulars

                    it[PoojaRecords.otherParticular] =
                        otherParticular

                    it[PoojaRecords.amount] =
                        transactionAmount

                    it[PoojaRecords.devoteeName] =
                        request.devotee_name.trim()

                    it[PoojaRecords.address] =
                        request.address

                    it[PoojaRecords.phoneNumber] =
                        request.phone_number
                }
            }


            if (updatedRows == 0) {

                call.respond(
                    HttpStatusCode.NotFound,
                    ApiError("Pooja record not found")
                )

            } else {

                call.respond(
                    HttpStatusCode.OK,

                    PoojaCreateResponse(
                        s_no = id,
                        message =
                            "Pooja record updated successfully"
                    )
                )
            }
        }


        /*
         * DELETE /api/pooja/{id}
         *
         * Deletes an existing pooja record.
         */
        delete("/api/pooja/{id}") {

            val id =
                call.parameters["id"]?.toLongOrNull()


            if (id == null) {

                call.respond(
                    HttpStatusCode.BadRequest,
                    ApiError("Invalid record ID")
                )

                return@delete
            }


            val deletedRows = transaction {

                PoojaRecords.deleteWhere {

                    PoojaRecords.sNo eq id
                }
            }


            if (deletedRows == 0) {

                call.respond(
                    HttpStatusCode.NotFound,
                    ApiError("Pooja record not found")
                )

            } else {

                call.respond(
                    HttpStatusCode.OK,
                    ApiError(
                        "Pooja record deleted successfully"
                    )
                )
            }
        }
    }
}
