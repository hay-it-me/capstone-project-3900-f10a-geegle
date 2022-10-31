import db from './db.js'

// READ
const getEventByIdDb = async(eventID) => {
    const result = await db.query (
        "SELECT * FROM events WHERE eventID = $1", [eventID])
    return result.rows
}

// READ
const getEventByIdDisplayDb = async(eventID) => {
    const result = await db.query (
        "SELECT * FROM events e JOIN users u ON (e.hostID = u.userID) " +
        "JOIN venues v on (e.eventVenue = v.venueID) WHERE eventID = $1", [eventID])
    return result.rows
}

// READ
const getEventsByHostIdDb = async(userID) => {
    const result = await db.query (
        "SELECT * FROM events e JOIN venues v ON (e.eventVenue = v.venueID) WHERE e.hostID = $1", [userID])
    return result.rows
}

// READ
const getAllEventsNotSoldOutDb = async() => {
    const result = await db.query (
        "SELECT * FROM events e JOIN venues v ON (e.eventVenue = v.venueID) " +
        "JOIN users u ON (e.hostID = u.userID) " +
        "WHERE e.totalTicketAmount > (SELECT count(*) FROM tickets t, ticketPurchases p " +
        "WHERE e.eventID = t.eventID AND t.ticketID = p.ticketID)"
    )
    return result.rows
}

// READ
const getAllEventsDb = async() => {
    const result = await db.query(
        "SELECT * FROM events e JOIN venues v ON (e.eventVenue = v.venueID) JOIN users u ON (e.hostID = u.userID)"
    )
    return result.rows
}

// READ
const getEventVenueByNameDb = async(venueName) => {
    const result = await db.query(
        "SELECT * from venues where venueName = $1", [venueName])
    return result.rows
}

// READ
const getEventVenueByIdDb = async(venueID) => {
    const result = await db.query(
        "SELECT * from venues where venueName = $1", [venueID])
    return result.rows
}

//READ
const getHostofEventDb = async(eventID) => {
    const result = await db.query(
        "SELECT hostid from events where eventid = $1", [eventID]
    )
    return result.rows
}

// READ
const getEventGuestListByIdDb = async(eventID) => {
    const result = await db.query(
        "SELECT u.firstname, u.lastname, u.email from ticketPurchases tp " +
        "JOIN tickets t ON tp.ticketid = t.ticketid " +
        "JOIN users u ON tp.userid = u.userid WHERE t.eventid = $1", [eventID])
    return result.rows
}

// READ - Move this to venue db later when merge
export const isVenueSeatingAvailableDb = async(venueID) => {
    const result = await db.query(
        "SELECT count(*) from seats where venueID = $1", [venueID])
    return result.rows[0]
}

// CREATE
const addEventDb = async(eventName, hostID, startDateTime, endDateTime, eventDescription, eventType,
                         eventVenue, capacity, totalTicketAmount, image1, image2, image3) => {
    const result = await db.query (
        "INSERT INTO events (eventID, eventName, hostID, startDateTime, endDateTime, eventDescription, " +
        "eventType, eventVenue, capacity, totalTicketAmount, image1, image2, image3) " +
        "VALUES (default, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *",
        [eventName, hostID, startDateTime, endDateTime, eventDescription, eventType, eventVenue, capacity, 
         totalTicketAmount, image1, image2, image3]
    )
    return result.rows[0]
}

// CREATE
const addEventVenueDb = async(venueName, venueLocation, venueCapacity) => {
    const result = await db.query(
        "INSERT INTO venues (venueID, venueName, venueLocation, maxCapacity) VALUES (default, $1, $2, $3) RETURNING *",
        [venueName, venueLocation, venueCapacity]
    )
    return result.rows[0]
}

// CREATE
const addEventTicketTypeSeatingAllocation = async(eventID, ticketType, seatSection) => {
    const result = await db.query(
        "INSERT INTO eventTicketToSeatingAllocation (eventID, ticketType, seatSection) VALUES ($1, $2, $3) RETURNING *",
        [eventID, ticketType, seatSection]
    )
    return result.rows[0]
}

// DELETE
const removeEventByIdDb = async(ID) => {
    const result = await db.query (
        "DELETE FROM events WHERE eventID = $1", [ID]
    )
}

// UPDATE
const publishEventByIdDb = async(eventID) => {
    const result = await db.query(
        "UPDATE events SET published = TRUE WHERE eventID = $1 RETURNING *", [eventID]
    )
    return result.rows[0]
}

// UPDATE
const unpublishEventByIdDb = async(eventID) => {
    const result = await db.query(
        "UPDATE events SET published = FALSE WHERE eventID = $1 RETURNING *", [eventID]
    )
    return result.rows[0]
}

export {
    getEventByIdDb,
    getEventByIdDisplayDb,
    getEventsByHostIdDb,
    getAllEventsNotSoldOutDb,
    getAllEventsDb,
    getEventVenueByNameDb,
    getEventVenueByIdDb,
    getEventGuestListByIdDb,
    getHostofEventDb,
    addEventDb,
    addEventVenueDb,
    addEventTicketTypeSeatingAllocation,
    removeEventByIdDb,
    publishEventByIdDb,
    unpublishEventByIdDb
}