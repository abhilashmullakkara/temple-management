package com.example

import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.javatime.date

object PoojaRecords : Table("pooja_records") {

    val sNo = long("s_no")
    val particulars = varchar("particulars", 100)
    val devoteeName = varchar("devotee_name", 150)
    val address = text("address").nullable()
    val phoneNumber = varchar("phone_number", 20).nullable()

    val otherParticular = varchar("other_particular", 150).nullable()
    val amount = decimal("amount", 10, 2).nullable()
    val transactionDate = date("transaction_date").nullable()

    override val primaryKey = PrimaryKey(sNo)
}
