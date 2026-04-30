use aiken/crypto.{VerificationKeyHash}

pub type MintRedeemer {
    MintOwnerTicket{
        admin_address: VerificationKeyHash,
        owner_address: VerificationKeyHash,
        event_capacity: Int
    }

    MintAttendeeTicket{
        attendee_address: VerificationKeyHash,
        event_type: ByteArray,
        ticket_price: Option<Int>
    }
}