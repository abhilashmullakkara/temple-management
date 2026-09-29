package com.example

import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.javatime.date

object Expenses : Table("expenses") {

    val id = long("id")

    val expenseDate =
        date("expense_date")

    val nameOrDescription =
        varchar("name_or_description", 200)

    val amount =
        decimal("amount", 10, 2)

    override val primaryKey =
        PrimaryKey(id)
}
