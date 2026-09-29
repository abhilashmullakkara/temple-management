package com.example

import org.jetbrains.exposed.v1.core.Table

object PoojaParticulars : Table("pooja_particulars") {

    val id = long("id")
    val particulars = varchar("particulars", 100)
    val amount = decimal("amount", 10, 2)

    override val primaryKey = PrimaryKey(id)
}
