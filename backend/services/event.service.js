import {addEventDb, getAllEventsNotSoldOutDb, getAllEventsDb, getEventByIdDb, getEventByIdDisplayDb,
        getEventsByHostIdDb, getEventVenueByNameDb, getEventVenueByIdDb, getEventGuestListByIdDb, getHostofEventDb, 
        addEventVenueDb, publishEventByIdDb, isVenueSeatingAvailableDb, addEventTicketTypeSeatingAllocation,
        unpublishEventByIdDb, removeEventByIdDb, getEventsUserAttendingDb} from '../db/event.db.js' 
import { getEventReviewsByEventIdDb } from '../db/review.db.js'
import {addTicketDb} from '../db/ticket.db.js'
import { getUserByIdDb } from '../db/user.db.js'


/*  Request
    All fields must be filled in
    {
        events: {
            eventName: string,
            startDateTime: date,
            ...
        },
        tickets: [{ticketType: "Gold class", price: 50, ticketAmount: 20}, {...}]
    }
*/
export const createEventsService = async(req, res) => {
    try {
        const {events, tickets} = req.body

        const {eventName, startDateTime, endDateTime, 
            eventDescription, eventType, eventVenue, capacity,
            image1, image2, image3} = events
        
        if (endDateTime <= startDateTime) {
            return {events: null, statusCode : 400, msg: 'Invalid Starting and Finishing Times'}
        }
        if (capacity <= 0) {
            return {events: null, statusCode : 400, msg: 'Invalid Capacity'}
        }

        if (new Date(startDateTime) <= Date.now()) {
            return {events: null, statusCode : 400, msg: 'Invalid Event Date'}
        }

        let totalTickets = 0;
        for (let i = 0; i < tickets.length; i++) {
            totalTickets += tickets[i].ticketAmount
        }

        if (capacity < totalTickets) {
            return {events: null, statusCode : 400, msg: 'Capacity not sufficient'}
        }

        let venue = await getEventVenueByNameDb(eventVenue)
        let seatingAvailable = false
        if (venue.length === 0) {
            const { eventVenue, eventLocation, venueCapacity } = events
            venue = await addEventVenueDb(eventVenue, eventLocation, venueCapacity)
        } else {
            venue = venue[0]
            const venueSeats = await isVenueSeatingAvailableDb(venue.venueid)
            seatingAvailable = parseInt(venueSeats.count) ? true : false
        } 

        if (venue.maxcapacity < capacity) {
            return {events: null, statusCode : 400, msg: 'Venue capacity not sufficient for event'}
        }

        const newEvent = await addEventDb(eventName, req.userID, new Date(startDateTime), new Date(endDateTime), eventDescription,
                eventType, venue.venueid, capacity, totalTickets, image1, image2, image3)
    

        for (let i = 0; i < tickets.length; i++) {
            const {ticketType, price, ticketAmount, seatSections} = tickets[i]
            for (let j = 0 ; j < ticketAmount; j++) {
                const tickets = await addTicketDb(ticketType, price, newEvent.eventid)
            }  

            for (let seatSection of seatSections) {
                const allocation = await addEventTicketTypeSeatingAllocation(newEvent.eventid, ticketType, seatSection)
            }
        }

        return {events: {
                            eventID: newEvent.eventid,
                            eventName: newEvent.eventname,
                            hostID: newEvent.hostid,
                            startDateTime: newEvent.startdatetime,
                            endDateTime: newEvent.enddatetime,
                            eventDescription: newEvent.eventdescription,
                            eventType: newEvent.eventtype,
                            eventVenue: venue.venuename,
                            eventLocation: venue.venuelocation,
                            seatingAvailable: seatingAvailable,
                            capacity: newEvent.capacity,
                            totalTicketAmount: newEvent.totalticketamount,
                            image1: newEvent.image1,
                            image2: newEvent.image2,
                            image3: newEvent.image3
                        }, 
                statusCode : 201, 
                msg: 'Event Created'}

    } catch (e) {
        throw e
    }  
}

export const publishEventsService = async(req, res) => {
    try {
        const eventID = req.params.eventID;
        const event = await getEventByIdDb(eventID);
        if (event.length != 1) {
            return {events: null, statusCode : 404, msg: 'Event does not exist'}
        }
        if (req.userID != event[0].hostid) {
            return {events: null, statusCode : 403, msg: 'You are not the owner of this event'}
        }
        if (event[0].published) {
            return {events: null, statusCode : 400, msg: 'Event is already published'}
        }
        const publishedEvent = await publishEventByIdDb(eventID);

        return {events: {
                    eventID: publishedEvent.eventid,
                    published: publishedEvent.published
                },
                statusCode : 201, 
                msg: 'Event Published'}

    } catch(e) {
        throw e
    }
}

export const unpublishEventsService = async(req, res) => {
    try {
        const eventID = req.params.eventID;
        const event = await getEventByIdDb(eventID);
        if (event.length != 1) {
            return {events: null, statusCode : 404, msg: 'Event does not exist'}
        }
        if (req.userID != event[0].hostid) {
            return {events: null, statusCode : 403, msg: 'You are not the owner of this event'}
        }
        if (!event[0].published) {
            return {events: null, statusCode : 400, msg: 'Event is already unpublished'}
        }
        const unpublishedEvent = await unpublishEventByIdDb(eventID);

        return {events: {
                    eventID: unpublishedEvent.eventid,
                    published: unpublishedEvent.published
                },
                statusCode : 200, 
                msg: 'Event Unpublished'}

    } catch(e) {
        throw e
    }
}

export const deleteEventsService = async(req, res) => {
    try {
        const eventID = req.params.eventID;
        const event = await getEventByIdDb(eventID)
        if (event.length != 1) {
            return {statusCode : 404, msg: 'Event does not exist'}
        }
        if (req.userID != event[0].hostid) {
            return {statusCode : 403, msg: 'You are not the owner of this event'}
        }

        await removeEventByIdDb(eventID);
        return {statusCode : 200, msg: 'Event deleted'}

    } catch (e) {
        throw e
    }
}

export const getEventService = async(req, res) => {
    try {
        const event = await getEventByIdDisplayDb(req.params.eventID);
        if (event.length === 0) {
            return {events: null, statusCode: 404, msg: 'Event Id Not Found'}
        } 

        return {event: {
                    eventID: event[0].eventid,
                    eventName: event[0].eventname,
                    hostID: event[0].hostid,
                    hostName: event[0].firstname + ' ' + event[0].lastname,
                    hostEmail: event[0].email,
                    startDateTime: event[0].startdatetime,
                    endDateTime: event[0].enddatetime,
                    eventDescription: event[0].eventdescription,
                    eventType: event[0].eventtype,
                    eventVenue: event[0].venuename,
                    eventLocation: event[0].venuelocation,
                    venueCapacity: event[0].maxcapacity,
                    capacity: event[0].capacity,
                    totalTicketAmount: event[0].totalticketamount,
                    image1: event[0].image1,
                    image2: event[0].image2,
                    image3: event[0].image3,
                    published: event[0].published
                    }, 
                statusCode: 200, 
                msg: 'Event found'}
    } catch (e) {
        throw e
    }
}

export const getUpcomingEventsService = async(req, res) => {
    try {
        const eventList = await getAllEventsNotSoldOutDb();
        let upcomingEventList = [];
        const upcomingEventDateCutoff = new Date().setMonth((new Date().getMonth() + 1))
        for (let i = 0; i < eventList.length; i++) {
            if (new Date(eventList[i].startdatetime) >= new Date() && 
                new Date(eventList[i].startdatetime) <= upcomingEventDateCutoff &&
                eventList[i].published) {

                upcomingEventList.push({
                    eventID: eventList[i].eventid,
                    eventName: eventList[i].eventname,
                    hostID: eventList[i].hostid,
                    hostName: eventList[0].firstname + ' ' + eventList[0].lastname,
                    startDateTime: eventList[i].startdatetime,
                    endDateTime: eventList[i].enddatetime,
                    eventDescription: eventList[i].eventdescription,
                    eventType: eventList[i].eventtype,
                    eventVenue: eventList[i].venuename,
                    eventLocation: eventList[i].venuelocation,
                    venueCapacity: eventList[i].maxcapacity,
                    capacity: eventList[i].capacity,
                    totalTicketAmount: eventList[i].totalticketamount,
                    image1: eventList[i].image1,
                    image2: eventList[i].image2,
                    image3: eventList[i].image3
                });
            }
        }
        return {events: upcomingEventList, statusCode: 200, msg: 'Events found'}
    } catch (e) {
        throw e
    }
}

export const getAllEventsService = async(req, res) => {
    try {
        const eventList = await getAllEventsDb();
        const availableEventList = await getAllEventsNotSoldOutDb();
        let upcomingEventList = [];
        for (let i = 0; i < eventList.length; i++) {
            if (new Date(eventList[i].startdatetime) > new Date() &&
                eventList[i].published) {

                let soldOut = !availableEventList.some(event => event.eventid === eventList[i].eventid)
                if (eventList[i])
                upcomingEventList.push({
                    eventID: eventList[i].eventid,
                    eventName: eventList[i].eventname,
                    hostID: eventList[i].hostid,
                    hostName: eventList[0].firstname + ' ' + eventList[0].lastname,
                    startDateTime: eventList[i].startdatetime,
                    endDateTime: eventList[i].enddatetime,
                    eventDescription: eventList[i].eventdescription,
                    eventType: eventList[i].eventtype,
                    eventVenue: eventList[i].venuename,
                    eventLocation: eventList[i].venuelocation,
                    venueCapacity: eventList[i].maxcapacity,
                    capacity: eventList[i].capacity,
                    totalTicketAmount: eventList[i].totalticketamount,
                    image1: eventList[i].image1,
                    image2: eventList[i].image2,
                    image3: eventList[i].image3,
                    soldOut: soldOut
                });
            }
        }
        return {events: upcomingEventList, statusCode: 200, msg: 'Events found'}
    } catch (e) {
        throw e
    }
}


export const getHostEventsService = async(req, res) => {
    try {
        const eventList = await getEventsByHostIdDb(req.userID);
        
        let upcomingEventList = [];
        for (let i = 0; i < eventList.length; i++) {
            upcomingEventList.push({
                eventID: eventList[i].eventid,
                eventName: eventList[i].eventname,
                hostID: eventList[i].hostid,
                startDateTime: eventList[i].startdatetime,
                endDateTime: eventList[i].enddatetime,
                eventDescription: eventList[i].eventdescription,
                eventType: eventList[i].eventtype,
                eventVenue: eventList[i].venuename,
                eventLocation: eventList[i].venuelocation,
                venueCapacity: eventList[i].maxcapacity,
                capacity: eventList[i].capacity,
                totalTicketAmount: eventList[i].totalticketamount,
                published: eventList[i].published,
                image1: eventList[i].image1,
                image2: eventList[i].image2,
                image3: eventList[i].image3,
            });
        }
        
        return {events: upcomingEventList, statusCode: 200, msg: 'Events found'}
    } catch (e) {
        throw e
    }
}

export const getEventsUserAttendingService = async(req, res) => {
    try {
        let eventList = await getEventsUserAttendingDb(req.userID);
        
        let events = [];
        for (let i = 0; i < eventList.length; i++) {
            const event = await getEventByIdDisplayDb(eventList[i].eventid)
            events.push({
                eventID: event[0].eventid,
                eventName: event[0].eventname,
                hostID: event[0].hostid,
                hostName: event[0].firstname + ' ' + event[0].lastname,
                hostEmail: event[0].email,
                startDateTime: event[0].startdatetime,
                endDateTime: event[0].enddatetime,
                eventDescription: event[0].eventdescription,
                eventType: event[0].eventtype,
                eventVenue: event[0].venuename,
                eventLocation: event[0].venuelocation,
                venueCapacity: event[0].maxcapacity,
                capacity: event[0].capacity,
                totalTicketAmount: event[0].totalticketamount,
                image1: event[0].image1,
                image2: event[0].image2,
                image3: event[0].image3,
                published: event[0].published
                });
        }
        
        return {events: events, statusCode: 200, msg: 'Events found'}
    } catch (e) {
        throw e
    }
}

export const getEventGuestListService = async(req, res) => {
    try {
        const eventID = req.params.eventID;
        const host = await getHostofEventDb(eventID)
        if (req.userID != host[0].hostid) {
            return {guests: null, statusCode : 403, msg: 'You are not the owner of this event'}
        }
        
        const guests = await getEventGuestListByIdDb(eventID)
        
        let guestList = [];
        for (let guest of guests) {
            guestList.push({name: guest.firstname + ' ' + guest.lastname, email: guest.email})
        }
        // console.log(guestList)
        return {guests: guestList, statusCode: 200, msg: 'Guest list'}
    } catch (e) {
        throw e
    }
}

export const getHostDetailsService = async(req, res) => {
    try {
        const {hostID} = req.body;

        const host = getUserByIdDb(hostID);
        if (host.length == 0) {
            return {events: null, hostRating: null, statusCode : 404, msg: 'Host does not exist'}
        }
        const eventsByHost = await getEventsByHostIdDb(hostID);

        let eventSummary = [];
        let runningTotalReviewRatings = 0.00;
        let totalReviews = 0;
        for (let i = 0; i < eventsByHost.length; i++) {
            let eventReviews = await getEventReviewsByEventIdDb(eventsByHost[i].eventid);
            let eventReviewNum = 0;
            let eventReviewScore = 0.00;
            for (let j = 0; j < eventReviews.length; j++) {
                totalReviews++;
                eventReviewNum++;
                runningTotalReviewRatings += parseFloat(eventReviews[j].rating);
                eventReviewScore += parseFloat(eventReviews[j].rating);
            }
            if (eventReviewNum != 0) {
                eventReviewScore = eventReviewScore/eventReviewNum;
            } else {
                eventReviewScore = 0;
            }
            // consider adding top few reviews ordered by likes
            eventSummary.push({
                eventID: eventsByHost[i].eventid,
                eventName: eventsByHost[i].eventname,
                startDateTime: eventsByHost[i].startdatetime,
                endDateTime: eventsByHost[i].enddatetime,
                eventVenue: eventsByHost[i].venuename,
                eventScore: eventReviewScore,
                numReviews: eventReviewNum
            });   
        }

        if (totalReviews != 0) {
            runningTotalReviewRatings = runningTotalReviewRatings / totalReviews;
        } else {
            runningTotalReviewRatings = 0;
        }
        return {events: eventSummary, hostRating: runningTotalReviewRatings, statusCode: 200, msg: 'Details found'}

    } catch (e) {
        throw e
    }
}