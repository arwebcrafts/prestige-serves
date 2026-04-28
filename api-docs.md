# PST Customer API

##### Test Version 1.2.

##### Production Version 1.2.

##### February 13, 2025

## Overview

##### The Test API is hosted at: https://testpstapi.dbsinfo.com

##### The Production API is hosted at: https://pstapi.dbsinfo.com

##### Note: ALL calls going to the API must be HTTPS – HTTP calls will not be accepted or

##### successfully go through to the API.


## API Calls

##### API calls will require an oauth token, which can be retrieved by using the Token Request

##### endpoint. The Token Request endpoint requires an API User Name, API Password & the PST

##### User’s 3 character DBS Code.

##### For each call, this section provides:

- A name for the type of call
- A brief definition of what the call does and what it will return
- An example of code, showing how the call is enacted. The parts of the example unique

##### to this API are in bold font. The other parts of the example, which are standard calls

##### outside of this API are in regular font.

##### NOTE: Examples use the Production URL.


### Token Request

##### Use: Requests and returns the token to be used with all other API Requests. We use the oauth

##### standard to grant tokens.

##### ● token/ POST

##### ○ input:

##### ■ apiusername

##### ■ apipassword

##### ■ dbscode

##### ■ grant_type (always ‘password’)

##### ○ output:

##### ■ token

##### ■ token_type (value should always be “bearer”)

##### ■ expires_in

##### Example Token Request to use the API

```
POST https://pstapi.dbsinfo.com/token HTTP/1.
```
##### Request Headers:

```
Accept: */*
Cache-Control: no-cache
Host: pstapi.dbsinfo.com
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
Content-Type: application/x-www-form-urlencoded
```
##### Request Body:

```
grant_type: “password”
apiusername: “<api-username>“
apipassword: “<api-password>“
dbscode: “DBD”
```

### Search Jobs Request

##### Use: Returns a list of jobs. May be filtered through optional parameters.

##### ● jobs/ GET

##### ○ input:

##### ■ token

##### optional filter parameters:

##### ■ ServeeFirstName

##### ■ ServeeFirmOrLastName

##### ■ ServeeAddress

##### ■ ServeeAddress

##### ■ ServeeCity

##### ■ ServeeState

##### ■ ServeeZip

##### ■ ServeeCounty

##### ■ ClientReferenceNumber

##### ■ FromDate (requires DateSource)

##### ■ ThroughDate (requires DateSource)

##### ■ DateSource (see Note 4)

##### ■ ServerSerialNumber

##### ■ ClientSerialNumber

##### ■ AttorneySerialNumber

##### ■ ServerLastName

##### ■ ServerFirmName

##### ■ ClientLastName

##### ■ ClientFirmName

##### ■ AttorneyLastName

##### ■ AttorneyFirmName

##### ■ CaseSerialNumber

##### ■ CaseNumber

##### ■ BatchInvoiceNumber

##### ■ InvoiceStatus (see Note 28)

##### ■ InvoicePrintedType (see Note 29)

##### ■ CommentsViewableBy (see Note 33)

##### ■ AttachmentsViewableBy (see Note 34)

##### ■ GreaterThanChangeNumber

##### ■ ResultsLimit (0 = All)

##### ■ ResultsOrderBy (see Note 5)

##### ■ ResultsOrderIsDescending

##### ■ SearchPurpose (see Note 6)

##### ■ SearchByClientOrAttorneyNumber

##### ■ IncludeTotalJobCount

##### ■ UseLinkedResources


##### ● Resource links may still be used for some items to reduce the size

##### of the response. If you need all of the data for a specific job, see

##### Jobs Request, Item breakdown

##### ■ ServeeSelectMode (see Note 26)

##### ■ ResultsOffsetBy (see Note 27)

##### ○ output:

##### ■ ApiTransactionResult

##### ● JobModel[]

##### Example Search Jobs by Court Date Request (token values omitted):

##### Provide a list of all jobs with a court date of 1/1/

###### GET

```
https://pstapi.dbsinfo.com/jobs?DateSource=CourtDate&FromDate=1/20/2020&Through
Date=1/20/2020 HTTP/1.
```
##### Request Headers:

```
Authorization: “Bearer <token>“
Accept: */*
Cache-Control: no-cache
Host: pstapi.dbsinfo.com
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
```

### Job Request

##### Use: Returns detailed information about the job requested, using the Job number that PST

##### assigns.

##### ● jobs/{job_number} GET

##### ○ input:

##### ■ auth token

##### ■ job number

##### ○ output:

##### ■ ApiTransactionResult

##### ● JobModel[]

##### Example Job Request (token values omitted):

##### Provide all of the job details for PST job 2020000027

```
GET https://pstapi.dbsinfo.com/Jobs/2020000027 HTTP/1.
```
##### Request Headers:

```
Authorization: “Bearer <token>“
Accept: */*
Cache-Control: no-cache
Host: pstapi.dbsinfo.com
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
```

#### JSON Example Response

##### The following json snippet is an example response returned from GET /jobs endpoint.

{
“Jobs”: [
{
“JobNumber”: 2020000027,
“ChangeNumber”: 49841,
“InvoiceDate”: ““,
“InvoiceTotalAmount”: 90.0000,
“InvoiceTotalPaid”: 0.0000,
“InvoiceTotalDue”: 90.0000,
“IsDone”: false,
“InvoiceReference”: “https://pstapi.dbsinfo.com/invoices/2020000027”,
“Attorney”: {
“SerialNumber”: 156,
“ChangeNumber”: 15986,
“Href”: “https://pstapi.dbsinfo.com/entities/156”,
“FirmName”: “ABC & D \”LEGAL\” SERVICES”,
“LastName”: “Savage1”,
“FirstName”: “Ron”
},
“Client”: {
“SerialNumber”: 156,
“ChangeNumber”: 15986,
“Href”: “https://pstapi.dbsinfo.com/entities/156”,
“FirmName”: “ABC & D \”LEGAL\” SERVICES”,
“LastName”: “Savage1”,
“FirstName”: “Ron”
},
“Case”: {
“SerialNumber”: 426,
“ChangeNumber”: 2967,
“CaseClientSpecifics”: {
“Href”: “https://pstapi.dbsinfo.com/entities/156”
},
“Judge”: {
“SerialNumber”: 19,
“ChangeNumber”: 34,
“Href”: “https://pstapi.dbsinfo.com/judges/19”,
“FirstName”: “Judy”,
“LastName”: “Lady”
},
“CaseAttachmentsCollection”: {
“Href”: “https://pstapi.dbsinfo.com/cases/426/attachments”,
“Count”: 1
},
“CaseJobsReference”: “https://pstapi.dbsinfo.com/jobs?CaseSerialNumber=426”,
“Href”: “https://pstapi.dbsinfo.com/cases/426”,
“CaseNumber”: “SAF-12345-2013”,
“UniversalCaseNumber”: ““,
“County”: “Baker”,
“Plaintiff”: “State of Florida”,
“Defendant”: “Guy Sumone, aka Big Guy, Some Guy, Guy Guy, John.”,


“TypeCourt”: “Circuit Court of Oregon”,
“State”: “Oregon”,
“PlainTitle”: “Plaintiff”,
“DefendTitle”: “Defendant”,
“FileDate”: “9/24/2013”,
“AmendedFileDate”: ““
},
“PartyToBeServed”: {
“ID”: “5d1ab8e1-21cb-4f00-bd0b-a84d90c82932”,
“ChangeNumber”: 2923,
“SeqNumber”: 1,
“Href”: “https://pstapi.dbsinfo.com/jobs/2020000027/serveedetails/5d1ab8e1-
21cb-4f00-bd0b-a84d90c82932”,
“PartyType”: “Natural Person”,
“FirstName”: “Testy”,
“LastName”: “Tester”,
“ServeeStatus”: ““
},
“JobServer”: {
“SerialNumber”: 292,
“ChangeNumber”: 15940,
“Href”: “https://pstapi.dbsinfo.com/entities/292”,
“FirmName”: “Teresa Server”,
“LastName”: “Server Serve”,
“FirstName”: “Teresa”
},
“JobServers”: {
“Href”: “https://pstapi.dbsinfo.com/jobs/2020000027/jobservers”,
“Count”: 2
},
“ServeeDetails”: {
“Href”: “https://pstapi.dbsinfo.com/jobs/2020000027/serveedetails”,
“Count”: 2
},
“Comments”: {
“Href”: “https://pstapi.dbsinfo.com/jobs/2020000027/comments”,
“Count”: 3
},
“Attachments”: {
“Href”: “https://pstapi.dbsinfo.com/jobs/2020000027/attachments”,
“Count”: 2
},
“JobType”: “Classic”,
“ServeeLastFirstMiddle”: “Tester, Testy”,
“ServeeFullNameAndAddress”: “Testy Tester, 1234 Test Street”,
“Href”: “https://pstapi.dbsinfo.com/jobs/2020000027”,
“ClientReferenceNumber”: “ABC123”,
“DocumentsToServe”: “SUMMONS AND COMPLAINT”,
“CourtDateTime”: ““,
“ReceivedDateTime”: “12/17/2019 4:28 pm”,
“ActionDate”: ““,
“ExpireDate”: ““,
“LastServeDate”: ““,


“LastSubServeDate”: ““
}
],
“TransactionName”: “GetJobs”,
“IsSuccess”: true,
“TransactionErrors”: []
}


### Jobs Request, Item breakdown

##### Use: Returns a specific job with individual list items for Comments, Attachments & JobServers.

##### ● jobs/ GET

##### ○ input:

##### ■ token

##### optional filter parameters:

##### ■ useLinkedResources

##### ○ output:

##### ■ ApiTransactionResult

##### ● JobModel[]

##### Example Get additional breakdown/list of Collections for Comments, JobServers &

##### Attachments (token values omitted):

###### GET

##### https://pstapi.dbsinfo.com/jobs?jobNumber=2019000001&useLinkedResources=false

###### HTTP/1.

##### Request Headers:

```
Authorization: “Bearer <token>“
Accept: */*
Cache-Control: no-cache
Host: pstapi.dbsinfo.com
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
```

### Job Comments Request

##### Returns a job’s Comment info.

##### ● jobs/{job_number}/comments GET

##### ○ input:

##### ■ token

##### ■ job_number

##### ○ output:

##### ■ ApiTransactionResult

##### ● CommentModel[]

##### ● Summary

##### Example Job Comments request (token values omitted):

##### Get the servee comments for job 20200000027

```
GET https://pstapi.dbsinfo.com/jobs/20200000027/comments HTTP/1.
```
##### Request Headers:

```
Authorization: “Bearer <token>“
Accept: */*
Cache-Control: no-cache
Host: pstapi.dbsinfo.com
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
```

#### JSON Example Response

##### The following json snippet is an example response returned from GET

##### /jobs/{job_number}/comments endpoint.

{
"Comments": [{
"ID": 5,
"SeqNumber":1,
“CommentDateTime”:”4/10/2021 3:14pm”,
“CommentText”:”I am a comment.”,
“ChangeNumber”:1,
“IsAttempt”:true,
“Latitude”:0.00,
“Longitude”:0.00,
“HorizontalAccuracy”:0.
“ServeeDetailId”:<guid>,
“IsStatusReport”:true,
“IsAffidavit”:true,
“IsFieldSheet”:true,
“IsInvoice”:true,
“IsDiligence”:true,
“IsReviewed”:true,
“Source”:“Office User”,
“ListOrder”:1,
}]
}


### Create a New Job

##### Use: Creates a new Job, then returns the full model for the job created (loaded from the

##### database).

##### ● jobs/ POST

##### ○ input:

##### ■ auth token

##### ■ CreateJobModel

##### ○ output:

##### ■ ApiTransactionResult

##### ● JobModel


#### JSON Example Request

##### The following json snippet is an example request body that creates a new Job. This example

##### also tells the API to Attach a Field Sheet Document to the Job.

{
"Job":{
"AttorneySerialNumber":156,
"ClientSerialNumber":156,
"AddJobServers":[
{
"IsDefault":"true",
"ServerSerialNumber":
},
{
"IsDefault":"false",
"Server": {
"FirmName":"Jan Smith",
"Address1":"2345 A Street",
"City":"Winter Park",
"State":"FL",
"ServerActive":"true",
"IsServer":"true"
}
}
],
"PartyToBeServed": {
"FirstName":"Fred",
"LastName":"Thomas",
"AddressType":"Home",
"Address1":"12 Any Ave",
"City":"Winter Park",
"State":"FL",
"Zip":"32792"
},
"CreateServeeDetails": [
{
"FirstName":"Fred",
"LastName":"Thomas",
"Address1":"5518 Alternate Street",
"City":"Winter Park",
"State":"FL",
"Zip":"32792"
}

##### ] ,

"QueueDocumentOptions": {
"QueueFieldSheetOptions": {
"AttachPDF":true
}
}
}
}


### Update an Existing Job

##### Use: Updates an existing Job, then returns the full model for the job (loaded from the database).

##### ● jobs/ PUT

##### ○ input:

##### ■ auth token

##### ■ UpdateJobModel

##### ○ output:

##### ■ ApiTransactionResult

##### ● JobModel


#### JSON Example Request

##### The following json snippet is an example request body that updates an existing Job.

##### Example 1

##### Change the Case assigned to job 2021000004 to an existing Case with serial number 21.

{
"Job":{
"JobNumber":2021000004,
"CaseSerialNumber":
}
}

##### Example 2

##### Change the Case assigned to job 2021000004 to a new Case.

{
"Job":{
"JobNumber":2021000004,
"Case": {
"CaseNumber":"API-Case-Test-A1",
"State":"Florida",
"County":"Orange",
"PlainTitle":"Plaintiff",
"Plaintiff":"State of Florida",
"DefendTitle":"Defendant",
"Defendant":"Jan Smith",
"TypeCourt":"Circuit",
"FileDate":"1/1/2021",
"AmendedFileDate":"2/2/2021"
}
}
}

##### Example 3

##### Add a new Comment to job 2021000004.

{
"Job":{
"JobNumber":2021000004,
"CreateComments":[
{
"CommentDateTime":"5/12/2021 2:00pm",
"CommentText":"Attempted, but no one was home.",
"IsAttempt":"true",
"IsStatusReport":"true",
"IsReviewed":"true"
}
]
}
}


### Case Search Request

##### Use: Returns a list of Cases. May be filtered through optional parameters.

##### ● cases/ GET

##### ○ input:

##### ■ token

##### optional filter parameters:

##### ■ CaseNumber

##### ■ CaseSerialNumber

##### ■ CaseCounty

##### ■ Plaintiff

##### ■ Defendant

##### ■ ClientReferenceNumber

##### ■ ClientSerialNumber

##### ■ ResultsLimit

##### ■ ResultsOrderBy (see Note 25)

##### ■ ResultsOrderIsDescending

##### ■ GreaterThanChangeNumber

##### ■ ResultsOffsetBy (see Note 27)

##### ○ output:

##### ■ ApiTransactionResult

##### ● CaseModel[]

##### Example Cases Search Request (token values omitted):

##### Provide a list of cases with the case number AA-12345-

```
GET https://pstapi.dbsinfo.com/Cases?CaseNumber=AA-12345-2013 HTTP/1.
```
##### Request Headers:

```
Authorization: “Bearer <token>“
Accept: */*
Cache-Control: no-cache
Host: pstapi.dbsinfo.com
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
```

### Case Request

##### Use: Returns information about the case requested using the CaseSerialNumber.

##### ● cases/{case_serial_number} GET

##### ○ input:

##### ■ auth token

##### ■ case serial number

##### ○ output:

##### ■ ApiTransactionResult

##### ● CaseModel[]

##### Example Case Request (token values omitted):

##### Provide all of the case information for case 10

```
GET https://pstapi.dbsinfo.com/Cases/10 HTTP/1.
```
##### Request Headers:

```
Authorization: “Bearer <token>“
Accept: */*
Cache-Control: no-cache
Host: pstapi.dbsinfo.com
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
```

#### JSON Example Response

##### The following json snippet is an example response returned from GET /cases endpoint.

{
“Cases”: [
{
“SerialNumber”: 10,
“ChangeNumber”: 1509,
“CaseAttachmentsCollection”: {
“Href”: “https://pstapi.dbsinfo.com/cases/10/attachments”,
“Count”: 0
},
“CaseJobsReference”: “https://pstapi.dbsinfo.com/jobs?CaseSerialNumber=10”,
“Href”: “https://pstapi.dbsinfo.com/cases/10”,
“CaseNumber”: “99”,
“UniversalCaseNumber”: ““,
“County”: “Seminole”,
“Plaintiff”: “State Farm”,
“Defendant”: “Testy Defendant”,
“TypeCourt”: “Circuit Court of Florida”,
“State”: “Florida”,
“PlainTitle”: “Plaintiff”,
“DefendTitle”: “Defendant”,
“FileDate”: ““,
“AmendedFileDate”: ““
}
],
“TransactionName”: “GetCases”,
“IsSuccess”: true,
“TransactionErrors”: []
}


### Case Attachments Request

##### Returns a case’s attachment info.

##### ● cases/{case_serial_number}/attachments GET

##### ○ input:

##### ■ token

##### ■ job_number

##### ○ output:

##### ■ ApiTransactionResult

##### ● AttachmentModel[]

##### ● Summary

##### Example Case Attachments request (token values omitted):

##### Get the attachments information for job 27842

```
GET https://pstapi.dbsinfo.com/cases/27842/attachments HTTP/1.
```
##### Request Headers:

```
Authorization: “Bearer <token>“
Accept: */*
Cache-Control: no-cache
Host: pstapi.dbsinfo.com
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
```

#### JSON Example Response

##### The following json snippet is an example response returned from GET

##### jobs/{job_number}/attachments endpoint.

{
"Attachments": [{
"ID": "91ea4bfe-f606-4106-8b03-db51816a6a56",
"Description": "DOCUMENTS FOR SERVICE",
"Purpose": "Other",
"FileExtension": "pdf",
"href”:”https://pstapi.dbsinfo.com/attachments/91ea4bfe-f606-4106-8b03-db51816a6a56”
}]
}


### Create a New Case

##### Use: Creates a new Case, then returns the full model for the case created (loaded from the

##### database).

##### ● cases/ POST

##### ○ input:

##### ■ auth token

##### ■ CreateCaseModel

##### ○ output:

##### ■ ApiTransactionResult

##### ● CaseModel


#### JSON Example Request

##### The following json snippet is an example request body that creates a new Case.

{
"Case": {
"CaseNumber":"API-Case-Test-A1",
"State":"Florida",
"County":"Orange",
"PlainTitle":"Plaintiff",
"Plaintiff":"State of Florida",
"DefendTitle":"Defendant",
"Defendant":"John Smith",
"TypeCourt":"Circuit",
"FileDate":"1/1/2021",
"AmendedFileDate":"2/2/2021",
"UniversalCaseNumber":"xvx-111",
"CaseClientSpecifics":{
"ClientSerialNumber":156,
"ClientReferenceNumber":"ABC-REF"
},
"Judge": {
"FirstName":"Judy",
"LastName":"Brown"
}

}
}


### Update an Existing Case

##### Use: Updates an existing Case, then returns the full model for the case updated (loaded from

##### the database).

##### ● cases/ PUT

##### ○ input:

##### ■ auth token

##### ■ UpdateCaseModel

##### ○ output:

##### ■ ApiTransactionResult

##### ● CaseModel


#### JSON Example Request

##### The following json snippet is an example request body that updates an existing Case.

{
"Case": {
"SerialNumber": 473,
"CaseNumber":"XYZ-API-Test-A2",
"AmendedFileDate":"2/23/2022",
"JudgeSerialNumber":20
}

##### }


### Court Request

##### Use: Returns information about a court using the Court’s SerialNumber.

##### ● courts/{court_serial_number} GET

##### ○ input:

##### ■ auth token

##### ■ court serial number

##### ○ output:

##### ■ ApiTransactionResult

##### ● CourtModel[]

##### Example Court Request (token values omitted):

##### Provide all of the court information for a court with serial number 13

```
GET https://pstapi.dbsinfo.com/Courts/13 HTTP/1.1
```
##### Request Headers:

```
Authorization: “Bearer <token>“
Accept: */*
Cache-Control: no-cache
Host: pstapi.dbsinfo.com
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
```

#### JSON Example Response

##### The following json snippet is an example response returned from GET /cases endpoint.

{
"Court": {
"SerialNumber": 13,
"ChangeNumber": 33,
"Href": "https://pstapi.dbsinfo.com/courts/13",
"County": "Seminole",
"TypeCourt": "Circuit",
"State": "Florida",
"Branch": "",
"StreetAddress1": "12 Court Street",
"StreetAddress2": "",
"StreetCity": "Winter Park",
"StreetZip": "32792",
"MailingAddress1": "",
"MailingAddress2": "",
"MailingCity": "",
"MailingZip": "",
"Notes": "",
"ShowNotesAtSelection": false
},
"TransactionName": "GetCourt",
"IsSuccess": true,
"TransactionErrors": []

### }


### Entities Search Request

##### Use: Returns a list of Entities. May be filtered through optional parameters.

##### ● entities/ GET

##### ○ input:

##### ■ token

##### optional filter parameters:

##### ■ EntityType

##### ■ ActiveOnly

##### ■ SearchText

##### ■ SearchBy

##### ■ GreaterThanChangeNumber

##### ■ ResultsLimit

##### ■ ResultsOrderBy

##### ■ ResultsOrderIsDescending

##### ○ output:

##### ■ ApiTransactionResult

##### ● EntityModel[]

##### Example Entities Request (token values omitted):

##### Provide a list of entities

```
GET https://pstapi.dbsinfo.com/Entities HTTP/1.1
```
##### Request Headers:

```
Authorization: “Bearer <token>“
Accept: */*
Cache-Control: no-cache
Host: pstapi.dbsinfo.com
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
```

#### JSON Example Response

#### The following json snippet is an example response returned from GET /entities endpoint.

{
“Entities”: [
{
“SerialNumber”: 33,
“ChangeNumber”: 53505,
“FirmName”: “Rick Stevens”,
“LastName”: “Stevens”,
“FirstName”: “Rick”,
“Address1”: “Ap #494-2764 Sit Road”,
“Address2”: ““,
“Zip”: “34698”,
“City”: “Dunedin”,
“State”: “FL”,
“Phone”: “7277849045”,
“ClientActive”: false,
“ServerActive”: true,
“IsClient”: false,
“IsAttorney”: false,
“IsServer”: true
}
]}


### Entities Search Request by Login

##### Use: Returns a list of Entities.

##### ● entities/wsp-login GET

##### ○ input:

##### ■ token

##### ■ WspLogin

##### ■ WspPassword

##### ○ output:

##### ■ ApiTransactionResult

##### ● EntityModel[]

##### Example Entities Request (token values omitted):

##### Provide a list of entities

```
GET https://pstapi.dbsinfo.com/Entities HTTP/1.1
```
##### Request Headers:

```
Authorization: “Bearer <token>“
Accept: */*
Cache-Control: no-cache
Host: pstapi.dbsinfo.com
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
```

#### JSON Example Response

#### The following json snippet is an example response returned from GET /entities endpoint.

{
“Entities”: [
{
“SerialNumber”: 33,
“ChangeNumber”: 53505,
“FirmName”: “Rick Stevens”,
“LastName”: “Stevens”,
“FirstName”: “Rick”,
“Address1”: “Ap #494-2764 Sit Road”,
“Address2”: ““,
“Zip”: “34698”,
“City”: “Dunedin”,
“State”: “FL”,
“Phone”: “7277849045”,
“ClientActive”: false,
“ServerActive”: true,
“IsClient”: false,
“IsAttorney”: false,
“IsServer”: true
}
]}


### Entity Request

##### Use: Returns information about the entity requested using the EntitySerialNumber.

##### ● entities/{entity_serial_number} GET

##### ○ input:

##### ■ auth token

##### ■ entity serial number

##### ○ output:

##### ■ ApiTransactionResult

##### ● EntityModel[]

##### Example Entity Request (token values omitted):

##### Provide all of the entity information for entity 4426

```
GET https://pstapi.dbsinfo.com/Entities/4426 HTTP/1.1
```
##### Request Headers:

```
Authorization: “Bearer <token>“
Accept: */*
Cache-Control: no-cache
Host: pstapi.dbsinfo.com
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
```

### Entity Contacts Request

##### Returns contacts for an Entity.

##### ● entities/{entity_serial_number}/contacts GET

##### ○ input:

##### ■ token

##### ■ entity serial number

##### ○ output:

##### ■ ApiTransactionResult

##### ● EntityContactModel[]

##### ● Summary

##### Example Entity Contacts request (token values omitted):

##### Get the contacts for entity 4426

```
GET https://pstapi.dbsinfo.com/entities/156/contacts HTTP/1.1
```
##### Request Headers:

```
Authorization: “Bearer <token>“
Accept: */*
Cache-Control: no-cache
Host: pstapi.dbsinfo.com
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
```

#### JSON Example Response

##### The following json snippet is an example response returned from GET

##### /entities/{entity_serial_number}/contacts endpoint.

{
"EntityContacts": [
{
"SerialNumber": 108,
"ChangeNumber": 220,
"IsActive": true,
"Name": "Johnny C.",
"EmailAddress": "jcontact@entity.com",
"Phone": "",
"PhoneExtension": "",
"IsDefault": true
}
}


### Create a New Entity Contact

##### Use: Creates a new Entity Contact, then returns the full model for the contact created (loaded

##### from the database).

##### ● entities/{entity_serial_number}/contacts POST

##### ○ input:

##### ■ auth token

##### ■ entity serial number (ex. SerialNumber for a Client)

##### ■ CreateEntityContactModel

##### ○ output:

##### ■ ApiTransactionResult

##### ● EntityContactModel

##### Example Create Entity Contacts (token values omitted):

##### Create a new contact for entity 4426

```
POST https://pstapi.dbsinfo.com/entities/4426/contacts HTTP/1.1
```
##### Request Headers:

```
Authorization: “Bearer <token>“
Accept: */*
Cache-Control: no-cache
Host: pstapi.dbsinfo.com
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
```

#### JSON Example Request

##### The following json snippet is an example request body that creates a new contact.

{
"Contact":
{
"Name": "Ted A Contact",
"EmailAddress": "ted@contact.com",
"Phone":"4075551212",
"PhoneExtension":"100",
"IsActive":true,
"IsDefault":true
}
}


### Update an Existing Entity Contact

##### Use: Updates an existing Entity Contact, then returns the full model for the contact created

##### (loaded from the database).

##### ● entities/{entity_serial_number}/contacts PUT

##### ○ input:

##### ■ auth token

##### ■ entity serial number (ex. SerialNumber for a Client)

##### ■ UpdateEntityContactModel

##### ○ output:

##### ■ ApiTransactionResult

##### ● EntityContactModel

##### Example Update Entity Contacts (token values omitted):

##### Update an existing contact for entity 4426

```
PUT https://pstapi.dbsinfo.com/entities/4426/contacts HTTP/1.1
```
##### Request Headers:

```
Authorization: “Bearer <token>“
Accept: */*
Cache-Control: no-cache
Host: pstapi.dbsinfo.com
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
```

#### JSON Example Request

##### The following json snippet is an example request body that updates an existing contact.

{
"Contact":
{
"SerialNumber":123,
"IsDefault":false
}

### }


### Create a New Entity

##### Use: Creates a new Entity, then returns the full model for the entity created (loaded from the

##### database).

##### ● entities/ POST

##### ○ input:

##### ■ auth token

##### ■ CreateEntityModel

##### ○ output:

##### ■ ApiTransactionResult

##### ● EntityModel


#### JSON Example Request

##### The following json snippet is an example request body that creates a new Server (entity).

{
"Entity": {
"FirmName": "Jan Serverson",
"Address1": "12 New Street",
"Address2": "",
"Zip": "32792",
"City": "Winter Park",
"State": "FL",
"Phone": "4075551212",
"ClientActive": false,
"ServerActive": true,
"IsClient": false,
"IsAttorney": false,
"IsServer": true
}
}


### Update an Existing Entity

##### Use: Updates an existing Entity, then returns the full model for the entity updated (loaded from

##### the database).

##### ● entities/ PUT

##### ○ input:

##### ■ auth token

##### ■ UpdateEntityModel

##### ○ output:

##### ■ ApiTransactionResult

##### ● EntityModel


#### JSON Example Request

##### The following json snippet is an example request body that updates the First and Last name for

##### an existing Entity.

{
"Entity": {
"SerialNumber": 385,
"FirstName": "Jan",
"LastName": "Serverson"
}

### }


### Servee Details Request

##### Returns Servee data for a particular job.

##### ● jobs/{job_number}/ServeeDetails GET

##### ○ input:

##### ■ token

##### ■ job_number

##### ○ output:

##### ■ ApiTransactionResult

##### ● ServeeDetailModel[]

##### Example ServeeDetails request (token values omitted):

##### Get the servee details for job 20200000027

```
GET https://pstapi.dbsinfo.com/jobs/20200000027/ServeeDetails HTTP/1.1
```
##### Request Headers:

```
Authorization: “Bearer <token>“
Accept: */*
Cache-Control: no-cache
Host: pstapi.dbsinfo.com
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
```

#### JSON Example Response

##### The following json snippet is an example response returned from GET

##### /jobs/{job_number}/ServeeDetails endpoint.

{
“ServeeDetails”: [{
“ID”: “0fe2535f-81de-46a0-983c-692368ce83da”,
“IsPartyToBeServed”: true,
“IsRepresentativeToBeServed”: false,
“SeqNumber”: 1,
“PartyType”: “Not Specified”,
“Prefix”: ““,
“FirstName”: “Bob”,
“LastName”: “White”,
“Suffix”: ““,
“Address1”: ““,
“Address2”: ““,
“City”: ““,
“State”: ““,
“Zip”: “null”,
“Relationship”: ““,
“County”: ““,
“ServeeStatus”: ““,
“Href”: “https://pstapi.dbsinfo.com/jobs/20200000027/ServeeDetails/{servee_id}”,
“ServiceDetails”: {
“ServedDateTime”: ““,
“TypeServiceSerialNumber”: 0,
“ServiceName”: “Undefined”,
“ServiceStatus”: ““,
“TypeServiceDetails”: ““,
“RecipientDescription”: {
“Age”: ““,
“Sex”: ““,
“Race”: ““,
“Height”: ““,
“Weight”: ““,
“Hair”: ““,
“Glasses”: ““
}
}
},

“ServeeAttachmentsCollection”:
{
“Count”:1,
“href”:”https://pstapi.dbsinfo.com/jobs/20200000027/ServeeDetails/{servee_id}/attachmen
ts”
}
“ServeeCommentsCollection”:
{
“Count”:1,


“href”:”https://pstapi.dbsinfo.com/jobs/20200000027/ServeeDetails/{servee_id}/comments”
}
}]
}


### Servee Detail Attachments Request

##### Returns a servee’s attachment info.

##### ● jobs/{job_number}/ServeeDetails/{servee_id}/attachments GET

##### ○ input:

##### ■ token

##### ■ job_number

##### ■ servee_id

##### ○ output:

##### ■ ApiTransactionResult

##### ● AttachmentModel[]

##### ● Summary

##### Example ServeeDetails request (token values omitted):

##### Get the servee details for job 20200000027, servee <guid>

```
GET https://pstapi.dbsinfo.com/jobs/20200000027/ServeeDetails/<guid>/attachments
HTTP/1.1
```
##### Request Headers:

```
Authorization: “Bearer <token>“
Accept: */*
Cache-Control: no-cache
Host: pstapi.dbsinfo.com
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
```

#### JSON Example Response

##### The following json snippet is an example response returned from GET

##### jobs/{job_number}/ServeeDetails/{servee_id}/attachments endpoint.

{
“Attachments”: [{
“ID”: “91ea4bfe-f606-4106-8b03-db51816a6a56”,
“Description”: “DOCUMENTS FOR SERVICE”,
“Purpose”: “Other”,
“FileExtension”: “pdf”,
“href”:”https://pstapi.dbsinfo.com/attachments/91ea4bfe-f606-4106-8b03-db51816a6a56”
}]
}


### Servee Detail Comments Request

##### Returns a servee’s Comment info.

##### ● jobs/{job_number}/ServeeDetails/{servee_id}/comments GET

##### ○ input:

##### ■ token

##### ■ job_number

##### ■ servee_id

##### ○ output:

##### ■ ApiTransactionResult

##### ● CommentModel[]

##### ● Summary

##### Example Servee comments request (token values omitted):

##### Get the servee comments for job 20200000027, servee <guid>

```
GET https://pstapi.dbsinfo.com/jobs/20200000027/ServeeDetails/<guid>/comments
HTTP/1.1
```
##### Request Headers:

```
Authorization: “Bearer <token>“
Accept: */*
Cache-Control: no-cache
Host: pstapi.dbsinfo.com
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
```

#### JSON Example Response

##### The following json snippet is an example response returned from GET

##### /jobs/{job_number}/ServeeDetails/{servee_id}/comments endpoint.

{
“Comments”: [{
“ID”: 5,
“SeqNumber”:1,
“CommentDateTime”:”4/10/2021 3:14pm”,
“CommentText”:”I am a comment.”,
“ChangeNumber”:1,
“IsAttempt”:true,
“Latitude”:0.00,
“Longitude”:0.00,
“HorizontalAccuracy”:0.00
“ServeeDetailId”:<guid>,
“IsStatusReport”:true,
“IsAffidavit”:true,
“IsFieldSheet”:true,
“IsInvoice”:true,
“IsDiligence”:true,
“IsReviewed”:true,
“ListOrder”:1,
}]
}


### Servers Request

##### Returns the server data for a particular job.

##### ● jobs/{job_number}/servers GET

##### ○ input:

##### ■ token

##### ■ job_number

##### ○ output:

##### ■ ApiTransactionResult

##### ● JobServersModel[]

##### ● Summary

##### Example Servers request (token values omitted):

##### Get the server info for job 20200000027

```
GET https://pstapi.dbsinfo.com/jobs/20200000027/servers HTTP/1.1
```
##### Request Headers:

```
Authorization: “Bearer <token>“
Accept: */*
Cache-Control: no-cache
Host: pstapi.dbsinfo.com
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
```

#### JSON Example Response

##### The following json snippet is an example response returned from GET

##### /jobs/{job_number}/servers endpoint.

{
“Servers”: [{
“IsDefault”: true,
“FirmName”:”Servin’ Up Fresh Suits”,
“FirstName”:”Kyle”,
“LastName”:”Hi”,
“href”: “https://pstapi.dbsinfo.com/entities/3000”
}]
}


### Types of Service Search Request

##### Use: Returns a list of the types of service. May be filtered through optional parameters.

##### ● typesofservice/ GET

##### ○ input:

##### ■ token

##### optional filter parameter:

##### ■ ActiveOnly

##### ○ output:

##### ■ ApiTransactionResult

##### ● TypeServiceModel[]

##### Example Types of Service Request (token values omitted):

##### Provide a list of the types of service.

```
GET https://pstapi.dbsinfo.com/TypesOfService HTTP/1.1
```
##### Request Headers:

```
Authorization: “Bearer <token>“
Accept: */*
Cache-Control: no-cache
Host: pstapi.dbsinfo.com
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
```

#### JSON Example Response

#### The following json snippet is an example response returned from GET /typesofservice endpoint.

{
“TypesOfService”: [
{
“SerialNumber”: 69,
“ServiceName”: “3 DAY NOTICE RESIDENTIAL”
}

### ]}


### Type of Service Request

##### Use: Returns information about the type of service requested using the

##### TypeServiceSerialNumber.

##### ● typesofservice/{type_service_serial_number} GET

##### ○ input:

##### ■ auth token

##### ■ type service serial number

##### ○ output:

##### ■ ApiTransactionResult

##### ● TypeServiceModel[]

##### Example Type of Service Request (token values omitted):

##### Provide all of the type service information for type service 26

```
GET https://pstapi.dbsinfo.com/TypesOfService/26 HTTP/1.1
```
##### Request Headers:

```
Authorization: “Bearer <token>“
Accept: */*
Cache-Control: no-cache
Host: pstapi.dbsinfo.com
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
```

#### JSON Example Response

##### The following json snippet is an example response returned from GET

#### /typesofservice/{type_service_serial_number} endpoint.

{
“TypesOfService”: [
{
“SerialNumber”: 69,
“ServiceName”: “3 DAY NOTICE RESIDENTIAL”,
“ServiceStatus”: ““,
“NJEquivalent”: 0,
“CAEquivalent”: 0,
“AffCommentsRequired”: false,
“ServerSelectable”: false,
“Active”: true,
“Template”:
“{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang1033{\\fonttbl{\\f0\\fnil\\fcharset0
Arial;}}\r\n\\viewkind4\\uc1\\pard\\b\\fs17 POSTED - RESIDENTIAL: \\b0 attached a true copy
of the \\b <<DOCUMENTS_SERVED>>\\b0 with the date and hour of service endorsed thereon by me,
to a conspicuous place on the property described within. \\par\r\n}”
}
]
}


### Attachment Request

##### Returns Attachment data.

##### ● attachments/{attachmentID} GET

##### ○ input:

##### ■ token

##### ■ attachmentID (guid)

##### ■ IncludeAttachmentFileBytes

##### ○ output:

##### ■ ApiTransactionResult

##### ● AttachmentModel

##### Example Attachment request (token values omitted):

##### Get the attachment with GUID AAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE

```
GET https://pstapi.dbsinfo.com/attachments/AAAAAAA-BBBB-CCCC-DDDD-
EEEEEEEEEEEE HTTP/1.1
```
##### Request Headers:

```
Authorization: “Bearer <token>“
Accept: */*
Cache-Control: no-cache
Host: pstapi.dbsinfo.com
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
```

#### JSON Example Response

##### The following json snippet is an example response returned from GET

##### /attachments/{attachmentID} endpoint.

{
“Attachment”: {
“ID”: “91ea4bfe-f606-4106-8b03-db51816a6a56”,
“Description”: “DOCUMENTS FOR SERVICE”,
“Purpose”: “Other”,
“FileExtension”: “pdf”,
“AttachmentFileBytes”: <bytes excluded>,
“ViewableByServer”: false,
“ViewableByClient”: false,
“Signed”: false,
“Filed”: false
}
}


### Invoice Request

##### Returns an Invoice’s details.

##### ● invoices/{invoice_number} GET

##### ○ input:

##### ■ token

##### ■ invoice_number

##### ○ output:

##### ■ ApiTransactionResult

##### ● InvoiceModel

##### ● Summary

##### Example Invoice request (token values omitted):

##### Get the data for invoice number 20200000027

```
GET https://pstapi.dbsinfo.com/invoices/20200000027 HTTP/1.1
```
##### Request Headers:

```
Authorization: “Bearer <token>“
Accept: */*
Cache-Control: no-cache
Host: pstapi.dbsinfo.com
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
```

### Search Invoices Request

##### Use: Returns a list of invoices. May be filtered through optional parameters.

##### ● invoices/ GET

##### ○ input:

##### ■ token

##### optional filter parameters:

##### ■ InvoiceNumber

##### ■ BatchInvoiceNumber

##### ■ FromDate

##### ■ ThroughDate

##### ■ ClientSerialNumber

##### ■ CaseNumber

##### ■ InvoiceStatus (see Note 28)

##### ■ GreaterThanChangeNumber

##### ■ IncludeTotalInvoiceCount

##### ■ InvoicePrintedType (see Note 29)

##### ■ IncludeLineItems

##### ■ ResultsLimit

##### ■ ResultsOrderBy (see Note 30)

##### ■ ResultsOrderIsDescending

##### ■ ResultsOffsetBy (see Note 27)

##### ○ output:

##### ■ ApiTransactionResult

##### ● InvoiceModel[]

##### ● TotalInvoiceCount

##### Example Search Invoices request (token values omitted):

##### Get all unpaid invoices for client 156.

###### GET

```
https://pstapi.dbsinfo.com/invoices?ClientSerialNumber=156&InvoiceStatus=UnpaidOnl
y HTTP/1.1
```
##### Request Headers:

```
Authorization: “Bearer <token>“
Accept: */*
Cache-Control: no-cache
Host: pstapi.dbsinfo.com
```

Accept-Encoding: gzip, deflate, br

##### Connection: keep-alive


### Payments Request

##### Returns an invoice’s payment data.

##### ● invoices/{invoice_number}/payments GET

##### ○ input:

##### ■ token

##### ■ invoice_number

##### ○ output:

##### ■ ApiTransactionResult

##### ● PaymentsModel[]

##### ● Summary

##### Example Payments request (token values omitted):

##### Get payments for invoice 20200000027

```
GET https://pstapi.dbsinfo.com/invoices/20200000027/payments HTTP/1.1
```
##### Request Headers:

```
Authorization: “Bearer <token>“
Accept: */*
Cache-Control: no-cache
Host: pstapi.dbsinfo.com
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
```

#### JSON Example Response

##### The following json snippet is an example response returned from GET

##### /invoices/{invoice_number}/payments endpoint.

{
"payments": [{
"ID":1,
"ChangeNumber":1,
"JobNumber":20200000027,
"Description":””,
"Method":1,
"Date":1,
"CheckNumber":1,
"Amount":100.01
}]
}


### Line Items Request

##### Returns an invoice’s line items data.

##### ● invoices/{invoice_number}/lineitems GET

##### ○ input:

##### ■ token

##### ■ invoice_number

##### ○ output:

##### ■ ApiTransactionResult

##### ● LineItemsModel[]

##### ● Summary

##### Example Invoice request (token values omitted):

##### Get the line items for invoice 20200000027

```
GET https://pstapi.dbsinfo.com/invoices/20200000027/lineitems HTTP/1.1
```
##### Request Headers:

```
Authorization: “Bearer <token>“
Accept: */*
Cache-Control: no-cache
Host: pstapi.dbsinfo.com
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
```

#### JSON Example Response

##### The following json snippet is an example response returned from GET

##### /invoices/{invoice_number}/lineitems endpoint.

{
"line items":[{
"ID":1,
"ChangeNumber":1,
"JobNumber":20200000027,
"SalesItemID":1,
"Description":””,
"PricingMethod":1,
"Rate":100.01,
“Quantity”:1,
"Amount":100.01,
“IsManualRate”:true,
“ServerRate”:100.01,
“ServerNumber”:1,
“ServerRateType”:””,
“IsManualServerRate”:true,
“IsTax1”:true,
“IsTax2”:true,
“IsCredit”:true,
“SortOrder”:1
}]
}


### Reports – Server Payables

##### Returns Server Payables Report data.

##### ● reports/serverpayables GET

##### ○ input:

##### ■ token

##### ■ ServerSelectMode (see Note 21)

##### ■ ServerSerialNumber

##### ● Used when ServerSelectMode value is ServerSerialNumber

##### ■ FromServerName

##### ● Used when ServerSelectMode value is LastName or FirmName

##### ■ ThroughServerName

##### ● Used when ServerSelectMode value is LastName or FirmName

##### ■ FromDate

##### ■ ThroughDate

##### ■ IncludeLineItems

##### ■ IncludePayments

##### ■ IncludeJobsNotInvoiced

##### ■ SortBy (see Note 22)

##### ■ ServerLocality (see Note 23)

##### ■ FileReturnType (see Note 24)

##### ○ output:

##### ■ ApiTransactionResult

##### ● ServerPayablesModel

##### Example Server Payables Report request (token values omitted):

##### Get report for server with serial number 60

###### GET

```
https://pstapi.dbsinfo.com/reports/ServerPayables?ServerSelectMode=ServerSerialNum
ber&ThroughDate=2/7/2022&IncludeLineItems=true&SortBy=JobNumber&ServerSerialN
umber=60 HTTP/1.1
```
##### Request Headers:

```
Authorization: “Bearer <token>“
Accept: */*
Cache-Control: no-cache
Host: pstapi.dbsinfo.com
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
```

### Reports – Classic Server Pay

##### Returns “Classic” Server Pay Report data based on Job Line Item totals. This report was mostly

##### used before Payables were introduced.

##### ● reports/classicserverpay GET

##### ○ input:

##### ■ token

##### ■ ServerSelectMode (see Note 21)

##### ■ ServerSerialNumber

##### ● Used when ServerSelectMode value is ServerSerialNumber

##### ■ FromServerName

##### ● Used when ServerSelectMode value is LastName or FirmName

##### ■ ThroughServerName

##### ● Used when ServerSelectMode value is LastName or FirmName

##### ■ FromDate

##### ■ ThroughDate

##### ■ IncludeLineItems

##### ■ SortBy (see Note 22)

##### ■ ServerLocality (see Note 23)

##### ■ FileReturnType (see Note 24)

##### ○ output:

##### ■ ApiTransactionResult

##### ● ClassicServerPayModel

##### Example Classic Server Pay Report request (token values omitted):

##### Get report for server with serial number 60

##### GET https://pstapi.dbsinfo.com/reports/

```
ClassicServerPay?ServerSelectMode=ServerSerialNumber&ThroughDate=2/7/2022&Incl
udeLineItems=true&SortBy=JobNumber&ServerSerialNumber=60 HTTP/1.1
```
##### Request Headers:

```
Authorization: “Bearer <token>“
Accept: */*
Cache-Control: no-cache
Host: pstapi.dbsinfo.com
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
```

### Generate Documents

##### Returns PDF Documents (ex. Affidavit, Invoice, Field Sheet).

##### ● documents/ GET

##### ○ input:

##### ■ token

##### ■ JobNumber (see Note 21)

##### ■ ServeeDetailID

##### ● Used when GenerateAffidavit value is True.

##### ■ ServerSerialNumber

##### ● Used when GenerateFieldSheet value is True

##### ■ GenerateAffidavit

##### ■ GenerateFieldSheet

##### ■ GenerateInvoice

##### ■ AttachDocumentsToJob

##### ● Default: False.

##### ● If True, generated documents will be attached to the job.

##### ○ output:

##### ■ ApiTransactionResult

##### ● GeneratedDocumentModel[]

##### Example Generate Documents request (token values omitted):

##### Generate an Affidavit PDF Document for job 2022000001

###### GET

```
https://pstapi.dbsinfo.com/documents/?JobNumber=2022000001&GenerateAffidavit=tru
e HTTP/1.1
```
##### Request Headers:

```
Authorization: “Bearer <token>“
Accept: */*
Cache-Control: no-cache
Host: pstapi.dbsinfo.com
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
```

#### JSON Example Response

##### The following json snippet is an example response returned from GET /documents endpoint.

{
"Documents": [
{
"FileBytes": "JVBERi0xLjMNCiXi48/TDQoxIDAgb2JqDQo8PC9U",
"DocumentType": "Affidavit",
"FileName": "Document.pdf"
}
],
"TransactionName": "GetDocuments",
"IsSuccess": true,
"TransactionErrors": []

## }


## Transaction Result

##### The data returned with each response will include properties which will allow you to determine

##### whether a given Request was successful. The following properties are included with each

##### response:

#### ApiTransactionResult

##### Type Name Info

##### string TransactionName

##### ApiTransactionErrorItem[] TransactionErrors

##### bool IsSuccess

#### ApiTransactionErrorItem

##### Type Name Notes

##### int ErrorCategoryCode See Note 7

##### string ErrorCategoryName

##### int ErrorCode See Note 8

##### string ErrorCodeDescription

##### string ErrorDetails


## Request & Response Models

##### Request and Response Models share several properties. These properties are grouped into a

##### Base Model for each type of operation.

##### Models used for creating resources are prefixed with the word “Create”. Models used for

##### updating resources are prefixed with the word “Update”. Models included with an API response

##### will not have a prefix.

##### Some response models will minimize the data usage by returning part or none of the complex

##### subtypes contained in the main object and utilizing hyperlink references to obtaining any further

##### data when needed.


### Attachment Models

#### AttachmentModelBase

#### Response, Create and Update Models are derived from this base model.

```
Type Name Info
string Description A description of the document
string Purpose A defined purpose for the
document, based on PST-defined
purposes (e.g., invoice, affidavit).
```
```
* See Note 1
string FileExtension File Extension for the Attachment
byte[] AttachmentFileBytes
bool ViewableByServer
bool ViewableByClient
bool Signed
bool Filed
```
#### CreateAttachmentModel

##### Use to create a new Attachment.

Includes all properties from AttachmentModelBase.
Currently this model has the same properties as its Base.

#### UpdateAttachmentModel

###### NOT IMPLEMENTED

#### AttachmentModel

#### Returned with response.

#### Includes all properties from AttachmentModelBase, plus:

```
Type Name Is Subset Info
guid ID An internal PST identifier for the Attachment
guid ServeeDetailID An internal PST identifier for the Servee Detail associated
with the Attachment
int ChangeNumber See Note 11
uri href
```

### Case Models

#### CaseModelBase

#### Response, Create and Update Models are derived from this base model.

```
Type Name Info
string CaseNumber The official court assigned case
number
string UniversalCaseNumber
string County
string Plaintiff
string Defendant
string TypeCourt
string State
string PlainTitle
string DefendTitle
string FileDate
string AmendedFileDate
```
#### CreateCaseModel

##### Use to create a new Case.

Includes all properties from CaseModelBase, plus:
Type Name Info
int JudgeSerialNumber
CreateJudgeModel Judge Ignored if JudgeSerialNumber
provided.
CaseClientSpecifics CaseClientSpecifics
CreateAttachmentModel[] CreateAttachments
guid[] AddAttachments

#### UpdateCaseModel

#### Use when updating an existing Case.

#### Includes all properties from CaseModelBase, plus:

```
Type Name Required Info
int SerialNumber Yes
int JudgeSerialNumber The internal PST serial number
for the case
CreateJudgeModel Judge Ignored if JudgeSerialNumber
provided
CaseClientSpecifics CaseClientSpecifics
CreateAttachmentModel[] CreateAttachments
guid[] AddAttachments
```
#### CaseModel

#### Returned with response.

#### Includes all properties from CaseModelBase, plus:


Type Name Is
Subs
et

```
Info
```
int SerialNumber The internal PST serial number for
the case
int ChangeNumber See Note 11
CaseClientSpecifics CaseClientSpecifics
CourtModel Court Yes
JudgeModel Judge Yes Subset with uri
CollectionReference Attachments Yes count, uri
uri CaseJobsReference
uri href


### Case Client Specifics Model

#### CaseClientSpecifics

#### Represents Client specific data for a given Case.

```
Type Name Info
int ClientSerialNumber
string ClientReferenceNumber A client-provided reference number
for the Case
int ContactSerialNumber The Entity Contact Serial Number for
the Client + Case combination
uri Href
```

### Comment Models

#### CommentModelBase

#### Response, Create and Update Models are derived from this base model.

```
Type Name Info
string CommentDateTime
string CommentText
bool IsAttempt A flag that indicates if the comment
is related to an attempt of service
bool IsStatusReport
bool IsAffidavit
bool IsFieldSheet
bool IsInvoice
bool IsDiligence
bool IsReviewed
string Source
```
#### CreateCommentModel

##### Use to create a new Comment.

Includes all properties from CommentModelBase.

##### Currently this model has the same properties as its Base.

#### UpdateCommentModel

#### Use when updating an existing Comment.

#### Includes all properties from CommentModelBase, plus:

```
Type Name Required Info
int SeqNumber Yes Internal PST sequence number for the comment
```
#### CommentModel

#### Returned with response.

#### Includes all properties from CommentModelBase, plus:

```
Type Name Is Subset Info
int SeqNumber
int ChangeNumber See Note 11
double Latitude
double Longitude
double HorizontalAccuracy
guid ServeeDetailId
string Source
string AuthorDBSCode The DBS Code of the PST Company that created
the Comment.
int ServerSerialNumber The Server Serial Number of the server that
created the comment from the field (using the
mobile app, iPST2 / PST Mobile).
int ListOrder
```

```
uri href
```
### Court Models

#### CourtModelBase

#### Response, Create and Update Models are derived from this base model.

```
Type Name Info
string CourtName
string County
string TypeCourt
string State
string Branch
string StreetAddress1
string StreetAddress2
string StreetCity
string StreetZip
string MailingAddress
string MailingAddress2
string MailingCity
string MailingZip
string Notes
bool ShowNotesAtSelection
```
#### CourtModel

#### Returned with response.

#### Includes all properties from CourtModelBase, plus:

```
Type Name Is Subset Info
int SerialNumber
int ChangeNumber See Note 11
uri href
```

### Entity Models

#### EntityModelBase

#### Response, Create and Update Models are derived from this base model.

```
Type Name Is Subset Info
string FirmName
string LastName
string FirstName
string Address1
string Address2
string City
string State
string Zip
string Phone
string EmailAddress
bool ClientActive
bool ServerActive
bool IsClient
bool IsAttorney
bool IsServer
string UserName
bool PrePayOnly
```
#### CreateEntityModel

##### Use to create a new Entity.

#### Includes all properties from EntityModelBase, plus:

```
Type Name Required Info
string Password
CreateEntityContactModel[] CreateContacts
string EntityDefaultsToUse None (default), Attorney,
Client, Server
```
#### UpdateEntityModel

#### Use when updating an existing Entity.

#### Includes all properties from EntityModelBase, plus:

```
Type Name Required Info
int SerialNumber Yes
string Password
CreateEntityContactModel[] CreateContacts
```
#### EntityModel

#### Returned with response.

Includes all properties from EntityModelBase, plus:

```
Type Name Is Subset Info
int SerialNumber
```

int ChangeNumber See Note 11
uri ContactsReference
uri href


### Entity Contact Models

#### EntityContactModelBase

#### Response, Create and Update Models are derived from this base model.

```
Type Name Info
string Name
string EmailAddress
string Phone
string PhoneExtension
bool IsDefault
bool IsActive
```
#### CreateEntityContactModel

##### Use to create a new Contact for an Entity.

Includes all properties from EntityModelBase..

#### Currently this model has the same properties as its Base.

#### UpdateEntityContactModel

#### Use when updating an existing Entity Contact.

#### Includes all properties from EntityModelBase, plus:

```
Type Name Required Info
int SerialNumber Yes
```
#### EntityContactModel

#### Returned with response.

Includes all properties from EntityContactModelBase, plus:
Type Name Is Subset Info
int SerialNumber
int ChangeNumber See Note 11
bool IsActive
uri href


### Invoice Models

##### Represents invoice related data. Includes Invoice Line Items & Payments.

#### InvoiceModel

```
Type Name Info
int InvoiceNumber
int JobChangeNumber
decimal TotalAmount
decimal TotalAmountDue
uri JobReference
uri Href
InvoiceLineItemModel[] InvoiceLineItems
InvoicePaymentModel[] InvoicePayments
```
#### UpdateInvoiceModel

```
Type Name Info
AddInvoiceLineItemModel[] AddLineItems Line Items to add to the invoice.
```

### Invoice Line Item Models

##### Represents the individual Sales Items that have been added to the invoice.

#### InvoiceLineItemModelBase

```
Type Name Info
guid SalesItemId
string Description
string PricingMethod See Note 16
decimal Rate
decimal Quantity
decimal Amount
bool IsManualRate
decimal ServerRate
int ServerNumber
string ServerRateType See Note 17
decimal ServerAmount
bool IsManualServerRate
bool IsTax1
bool IsTax2
bool IsCredit
int SortOrder See Note 19
```
#### InvoiceLineItemModel

##### Returned with response.

Includes all properties from InvoiceLineItemModelBase, plus:

```
Type Name Required Info
guid ID
int ChangeNumber See Note 11
int JobNumber
```
#### AddInvoiceLineItemModel

```
Type Name Info
guid SalesItemId
decimal Rate
decimal Quantity
```

### Invoice Payment Models

##### Represents payment related data that has been added to an invoice.

#### InvoicePaymentModelBase

#### Response, Create and Update Models are derived from this base model.

```
Type Name Info
string Description
decimal Amount
string Method See Note 18
string Date
string CheckNumber
```
#### InvoicePaymentModel

##### Returned with response.

Includes all properties from InvoicePaymentModelBase, plus:
Type Name Required Info
guid ID
int ChangeNumber See Note 11
int JobNumber


### Invoice Payment Models

##### Represents payment related data that has been added to an invoice.

#### InvoicePaymentModelBase

#### Response, Create and Update Models are derived from this base model.

```
Type Name Info
string Description
decimal Amount
string Method SEE NOTE ??
string Date
string CheckNumber
```
#### InvoicePaymentModel

##### Returned with response.

Includes all properties from InvoicePaymentModelBase, plus:
Type Name Required Info
guid ID
int ChangeNumber See Note 11
int JobNumber


### Job Models

#### JobModelBase

#### Response, Create and Update Models are derived from this base model.

```
Type Name Info
string ClientReferenceNumber A client-provided reference number
for the Job
string DocumentsToServe
string CourtDateTime
string ReceivedDateTime The date and time the job was
received
string ActionDate
string ExpireDate
string LastServeDate The last day the paper/job can be
served
string LastSubServeDate The last day the paper/job can be
sub-served
string Priority See Note 20
```
#### CreateJobModel

##### Use to create a new job.

Includes all properties from JobModelBase, plus:

```
Type Name Info
CreatePartyToBeServed PartyToBeServed
int AttorneySerialNumber
CreateEntityModel Attorney Ignored if AttorneySerialNumber
provided
int ClientSerialNumber
CreateEntityModel Client Ignored if ClientSerialNumber
provided
AddJobServerModel[] AddJobServers
int CaseSerialNumber
CreateCaseModel Case Ignored if CaseSerialNumber
provided
CreateServeeDetailModel[] CreateServeeDetails
UpdateServiceDetailsModel ServiceDetails
CreateCommentModel[] CreateComments
CreateAttachmentModel[] CreateAttachments
guid[] AddAttachments
UpdateInvoiceModel Invoice
CreateJobQueueDocumentOptions QueueDocumentOptions
```
#### UpdateJobModel

#### Use when updating an existing job.

#### Includes all properties from JobModelBase, plus:

```
Type Name Required Info
```

```
int JobNumber Yes The internal PST
serial number for
the Job
int AttorneySerialNumber Serial Number for
an Existing Attorney
(Entity) that you
would like to assign
to the Job.
CreateEntityModel Attorney Ignored if
AttorneySerialNum
ber provided
int ClientSerialNumber Serial Number for
an Existing Client
(Entity) that you
would like to assign
to the Job.
CreateEntityModel Client Ignored if
ClientSerialNumber
provided
AddJobServerModel[] AddJobServers
UpdateJobServerModel[] UpdateJobServers
int[] RemoveJobServerSerialNumbers
int CaseSerialNumber Serial Number for
an Existing Case
that you would like
to assign to the
Job.
CreateCaseModel Case Ignored if
CaseSerialNumber
provided
UpdatePartyToBeServedModel PartyToBeServed
CreateServeeDetailModel[] CreateServeeDetails
UpdateServeeDetailModel[] UpdateServeeDetails
UpdateServiceDetailsModel ServiceDetails
CreateCommentModel[] CreateComments
UpdateCommentModel[] UpdateComments
CreateAttachmentModel[] CreateAttachments
guid[] AddAttachments
UpdateInvoiceModel Invoice
```
#### JobModel

#### Returned with response.

#### Includes all properties from JobModelBase, plus:

```
Type Name Is
Subset
```
```
Info
```
```
int JobNumber The internal PST serial
number for the Job
int ClientTradedJobNumber Client’s job number (if
this job was created by a
WSP trading partner)
```

int ServerTradedJobNumber Server’s job number (if
this job was created by a
WSP trading partner)
int ChangeNumber See Note 11
string InvoiceDate The date the job was
invoiced
decimal InvoiceTotalAmount
decimal InvoiceTotalPaid
decimal InvoiceTotalDue
InvoiceModel Invoice Returned only if
UseLinkedResources is
false.
bool IsDone Indicates whether the job
is done or not. The
requirements of the
boolean are based on
options the PST user
sets
string JobType Classic, Enhanced,
ManualInvoice, OldStyle
See Note 12
string ServeeLastFirstMiddle Helps identify Jobs that
have no Servee Details
(OldStyle and
ManualInvoice
JobTypes).
string ServeeFullNameAndAddress Helps identify Jobs that
have no Servee Details
(OldStyle and
ManualInvoice
JobTypes).
ServiceDetailsModel ServiceDetails Included when JobStyle
value is “Classic” and
there are no
ServeeDetails with
IsActualService set to
true
CollectionReference ServeeDetails Yes
CaseModel Case Yes
AttachmentsCollectionReference Attachments Yes
CommentsCollectionReference Comments Yes
EntityModel Attorney Yes
EntityModel Client Yes
JobServersCollectionReference JobServers Yes
EntityModel DefaultServer Yes
uri InvoiceReference
uri href


### Job Server Models

##### Job Servers represent job specific data for a Server (Entity).

##### Note: Instead of the “Create” prefix, JobServers uses “Add”.

#### JobServerModelBase

#### Response, Create and Update Models are derived from this base model.

```
Type Name Info
bool IsDefault
```
#### AddJobServerModel

##### Adds a Server (Entity) to a Job.

Includes all properties from JobServerModelBase, plus:

```
Type Name Required Info
int ServerSerialNumber Yes
CreateEntityModel Server Ignored if ServerSerialNumber
provided
```
#### UpdateJobServerModel

#### Use when updating server related data for an existing job.

#### Includes all properties from JobServerModelBase, plus:

```
Type Name Required Info
int ServerSerialNumber Yes
```
#### JobServerModel

#### Returned with response.

#### Includes all properties from JobServerModelBase, plus:

```
Type Name Is Subset Info
EntityModel Server
```

### Judge Models

#### JudgeModelBase

#### Response, Create and Update Models are derived from this base model.

```
Type Name Info
string FirstName
string LastName
string Suffix
```
#### CreateJudgeModel

##### Use to create a new Judge.

Includes all properties from JudgeModelBase.

##### Currently this model has the same properties as its Base.

#### UpdateJudgeModel

#### Use when updating an existing Judge.

#### Includes all properties from JudgeModelBase, plus:

```
Type Name Required Info
int SerialNumber Yes
```
#### JudgeModel

#### Returned with response.

Includes all properties from JudgeModelBase, plus:

```
Type Name Is Subset Info
int SerialNumber
int ChangeNumber See Note 11
uri href
```

### Servee Detail Models

#### ServeeDetailModelBase

#### Response, Create and Update Models are derived from this base model.

##### Type Name Info

```
bool IsRepresentativeToBeServed A flag to designate that this Servee
Detail is the person or
representative to be served (ex.
Registered Agent). This value is
commonly used with CA jobs to
support their state required forms.
bool IsActualService A flag to designate that this Servee
Detail represents the person who
was served
string PartyType See Note 13
string Prefix
string FirstName
string LastName
string Suffix
string AddressType See Note 32
string Address1
string Address2
string City
string State
string Zip
string Relationship The relationship of the person
served to the party to be served
(e.g., spouse)
string County
string ServeeStatus See Note 14
```
#### CreateServeeDetailsModel

##### Use to create a new Servee Detail for a Job.

Includes all properties from ServeeDetailModelBase, plus:
Type Name Info
UpdateServiceDetailsModel ServiceDetails
CreateAttachmentModel[] CreateAttachments
CreateCommentModel[] CreateComments

#### UpdateServeeDetailModel

#### Use when updating an existing Servee Detail for a Job.

#### Includes all properties from ServeeDetailModelBase, plus:

```
Type Name Required Info
guid ID Yes Internal PST identifier for the
Servee Detail
UpdateServiceDetailsModel ServiceDetails
CreateCommentModel[] CreateComments
```

```
UpdateCommentModel[] UpdateComments
CreateAttachmentModel[] CreateAttachments
```
#### ServeeDetailModel

#### Returned with response.

#### Includes all properties from ServeeDetailModelBase, plus:

```
Type Name Is Subset Info
guid ID Internal PST identifier for the
Servee Detail
int ChangeNumber See Note 11
int SeqNumber
int ServerTradedJobNumber Server’s job number (if this job was
created by a WSP trading partner).
bool IsPartyToBeServed
ServiceDetailsModel ServiceDetails Only included for Jobs that have a
JobStyle value of “Enhanced” or
Servee Details with IsActualService
set to True.
CollectionReference Attachments Yes
CollectionReference Comments Yes
uri href
```

### Party to be Served Models

#### The Party to be Served Models are derived from the Servee Detail models.

#### CreatePartyToBeServedModel

#### Use when creating a Party to be Served for a new Job.

#### Includes all properties from CreateServeeDetailModel, plus:

```
Type Name Info
string Married See Note 10
string Military See Note 10
```
#### UpdatePartyToBeServedModel

#### Use when updating the Party to be Served for a Job.

#### Includes all properties from UpdateServeeDetailModel, plus:

```
Type Name Info
string Married See Note 10
string Military See Note 10
```
#### PartyToBeServedModel

#### Returned with response.

#### Includes all properties from ServeeDetailModel, plus:

```
Type Name Info
string Married Indicates whether the Party to be
Served is married.
See Note 10
string Military Indicates whether the Party to be
Served is in the military.
See Note 15
uri href
```

### Recipient Description Model

#### RecipientDescriptionModel

#### Use with Service Details models to provide a description of the person served.

```
Type Name Info
string Age
string Sex
string Race
string Height
string Weight
string Hair
string Glasses
string Eyes Only supported for Enhanced Jobs
string Other Only supported for Enhanced Jobs
```

### Service Details Models

##### NOTE: The “Create” Model does not exist for Service Details.

#### ServiceDetailsModelBase

#### Response, Create and Update Models are derived from this base model.

```
Type Name Info
string ServedDateTime Date/Time that the papers were
served/non-served.
int TypeServiceSerialNumber
RecipientDescriptionModel RecipientDescription Physical details of the person
served
```
#### UpdateServiceDetailsModel

Includes all properties from ServiceDetailsModelBase.

#### Currently this model has the same properties as its Base.

#### ServiceDetailsModel

#### Returned with response.

#### Includes all properties from ServiceDetailsModelBase, plus:

```
Type Name Info
string TypeServiceName Name of the Type of Service
selected for the Job / Servee
Detail.
string TypeServiceStatus Enumeration to represent the
status of the serve (e.g., served,
non-served).
See Note 9
string TypeServiceDetails Type of Service RTF Template
converted to Text. Field names
replaced with values from the Job /
Servee Detail.
double ServiceLocationLongitude GPS Longitude captured from
Server’s mobile device during
serve.
double ServiceLocationLatitude GPS Latitude captured from
Server’s mobile device during
serve.
double ServiceLocationAccuracy GPS Horizontal Accuracy captured
from Server’s mobile device during
serve.
```

### Type Service Model

#### TypeServiceModel

```
Type Name Info
int SerialNumber
string ServiceName
string ServiceStatus See Note 9
int NJEquivalent
int CAEquivalent
bool AffCommentsRequired
bool ServerSelectable If enabled, this Type Service can
be selected by Servers in the field
using iPST2 (Android/iOS)
bool IsActive
string Template Text (rtf) to describe how service
was made. Prints on the Affidavit of
Service and is included in “Job
Done” emails sent to the PST
User’s client.
```
```
May include data fields which are
pulled from the Job when the
Template is converted from RTF to
Text.
```
```
Template Data Field Example:
<<Party_To_Be_Served>>
uri Href
```

### Queue Document Options

#### CreateJobQueueDocumentOptions

#### These options control how documents are handled when creating a new job.

```
Type Name Info
QueueDocumentModel QueueFieldSheetOptions
```
#### QueueDocumentModel

#### These options tell the API whether to queue or attach documents to jobs.

```
Type Name Info
bool QueueHardcopy Adds the document to the PST Print Queue. These
documents can then be printed from Desktop PST or
WebPST.
bool QueuePDF Adds the document to the PST PDF Queue. These
documents can then be saved from Desktop PST or
WebPST.
bool AttachPDF The document will be attached to the Job.
bool UsePstDefaults Tells the API to use the Job Elements to determine how to
handle the document (same methods used by Desktop
PST and WebPST).
```

### Collection Reference Models

#### CollectionReference

#### Use with Service Details models to provide a description of the person served.

```
Type Name Info
Uri Href
int Count
```
#### CommentsCollectionReference

#### Includes all properties from CollectionReference.

```
Type Name Info
CommentModel[] List
```
#### AttachmentsCollectionReference

#### Includes all properties from CollectionReference.

```
Type Name Info
AttachmentModel[] List
```
#### JobServersCollectionReference

#### Includes all properties from CollectionReference.

```
Type Name Info
EntityModel[] List
```

### Server Payables Model

#### ServerPayablesModel

##### Type Name Info

```
ServerPayablesReportModel[] ServerReports Report data for individual servers.
decimal Total The total amount of payables for all
servers.
decimal TotalDue The total amount owed to all
servers.
decimal TotalPaid The total amount paid to all
servers.
string FileName
byte[] FileBytes Byte Array of PDF Report for all
servers.
```

### Server Payables Report Model

#### ServerPayablesReportModel

##### Type Name Info

```
int ServerSerialNumber
string ServerFirstName
string ServerLastName
string ServerFirmName
string ServerEmailAddress
decimal Total Total payables for server.
decimal TotalPaid Total payments for server.
decimal TotalDue Total amount owed to server.
Uri Href Resource link to server’s individual
report.
Uri ServerReference Resource link to server’s Entity
record.
string FileName
byte[] FileBytes Byte Array of PDF Report file for
server.
```

### Classic Server Pay Model

#### ClassicServerPayModel

##### Type Name Info

```
ClassicServerPayReportModel [] ServerReports Report data for individual servers.
decimal Total The total amount of payables for all
servers.
string FileName
byte[] FileBytes Byte Array of PDF Report for all
servers.
```

### Classic Server Pay Report Model

#### ClassicServerPayReportModel

##### Type Name Info

```
int ServerSerialNumber
string ServerFirstName
string ServerLastName
string ServerFirmName
string ServerEmailAddress
decimal Total Total payables for server.
Uri Href Resource link to server’s individual
report.
Uri ServerReference Resource link to server’s Entity
record.
string FileName
byte[] FileBytes Byte Array of PDF Report file for
server.
```

### Generated Document Model

#### GeneratedDocumentModel

##### Type Name Info

```
string DocumentType See Note 31
string FileName
byte[] FileBytes Byte Array of PDF Document
```

## Notes

#### Note 1

##### Attachment Purpose Enumerations:

```
 Affidavit
 Invoice
 DocumenttoServe
 Diligence
 Mailing
 RedactedAffidavit
 MotionforSubstituteService
 RedactedDiligence
 RedactedMailing
 AffidavitofLostOriginal
 BatchInvoice
 DocumenttoFile
 FieldSheet
 Picture
 SkipTrace
 MilitarySearch
 MarriageSearch
 Complaint
 Avoidance
 Payment
 DateStampedComplaint
 IssuedSummons
 AliasSummons
 Subpoena
 NonServeAffidavit
 EFileConfirmation
 EFileSummary
 EFiledProofofService
 Other
 AffidavitofServiceFiledwithCourt
 AmendedComplaint
 Conformed
 CoverSheet
 Docket
 FiledPraecipe-CertifiedMail
 FiledPraecipe-ProcessServer
 FilingReceipt
 Miscellaneous
 MotiontoAppointProcessServer
 Order
 OrdertoAppointProcessServer
 ProofofService
 PropertyInspection
 PropertyPhoto
 TitleReport
 Summons
 OccupancyAffidavit
```

```
 RequestforService
 PostalRequest
 Video
 ProofandEndorsedServiceCopy
```
#### Note 2

##### Entities Search - SearchBy Enumerations:

```
 FirmName
 LastName
 PhoneNumbers
 State
 NotificationEmailAddress
 UserName
```
#### Note 3

##### Entity Type Enumerations:

```
 Attorney
 Client
 Server
```
#### Note 4

##### DateSource Enumerations:

```
 ReceivedDate
 ActionDate
 ExpireDate
 CourtDate
 LastDayToServe
 LastDayToSubServe
 CreateDate
 CompletedDate
 InvoiceDate
 Closed
```
#### Note 5

##### Jobs Search - ResultsOrderBy Enumerations:

```
 Default
 JobNumber
 JobChangeNumber
 DateSource (see Note 4)
```
#### Note 6

##### Jobs Search – SearchPurpose Enumerations:

```
 AllJobs
 UnfinishedJobs
 UpdatesFromWspPartners
 JobsWithUnreviewedComments
 FinishedJobs
```
#### Note 7

##### ApiTransactionResult Error Category Codes:


```
 VALIDATION = 1,
 SAVE_DATA = 2,
 GET_DATA = 3
```
#### Note 8

##### ApiTransactionResult Error Codes:

```
 UNKNOWN = 0,
 CLIENT_NOT_FOUND = 1,
 INVALID_CASE_MODEL = 2,
 ATTACHMENT_NOT_FOUND = 3,
 MAX_ATTACHMENT_SIZE_EXCEEDED = 4,
 MISSING_FILE_BYTES_FOR_NEW_ATTACHMENT = 5,
 INVALID_ATTACHMENT_FILE_EXTENSION = 6,
 INVALID_DATE_TIME = 7,
 CASE_NOT_FOUND = 8,
 ERROR_LOADING_CASE = 9,
 JOB_SERVER_MISSING_SERVER_OR_SERVER_NUMBER = 10,
 JOB_SERVER_ALREADY_EXISTS_ON_JOB = 11,
 SERVER_NOT_FOUND = 12,
 TOO_MANY_DEFAULT_JOB_SERVERS = 13,
 PAID_JOB_SERVER_CANNOT_BE_REMOVED_FROM_JOB = 14,
 INVALID_ENTITY_MODEL = 15,
 ERROR_LOADING_ENTITY = 16,
 ERROR_CREATING_ENTITY = 17,
 ATTORNEY_NOT_FOUND = 18,
 CLASSIC_JOB_SERVICE_DETAILS_ON_WRONG_SERVEE = 19,
 CLASSIC_JOB_TOO_MANY_SERVICE_DETAILS = 20,
 TOO_MANY_ACTUAL_SERVICE_SERVEE_DETAILS = 21,
 TOO_MANY_REPRESENTATIVE_TO_BE_SERVED_SERVEE_DETAILS = 22,
 MISSING_NEW_COMMENT_TEXT = 23,
 INVALID_COMMENT_SEQ_NUM_FOR_SERVEE_DETAIL = 24,
 INVALID_COMMENT_SEQ_NUM = 25,
 COMMENT_NOT_FOUND = 26,
 INVALID_SERVEE_ID = 27,
 SERVEE_DETAIL_NOT_FOUND = 28,
 SERVEE_DETAIL_ID_PARTY_TO_BE_SERVED_MISMATCH = 29,
 INVALID_ENTITY_SERIAL_NUMBER = 30,
 JOB_NOT_FOUND = 31,
 INVALID_JOB_NUMBER = 32,
 ENTITY_NOT_FOUND = 33,
 ERROR_SAVING_ENITY = 34,
 INVALID_ATTACHMENT_ID = 35,
 API_SESSION_NOT_FOUND = 36,
 ERROR_SAVING_JUDGE = 37,
 ERROR_SAVING_CASE = 38,
 ERROR_SAVING_JOB = 39,
 TYPE_SERVICE_NOT_FOUND = 40,
 ENTITIES_BY_WSP_LOGIN_ONE_OR_MORE_BLANK_VALUES = 41
 SERVICE_NOT_ENABLED = 42
```
#### Note 9

##### ServiceStatus Enumerations

######  N/A

```
 Served
 NonServed
 InProgress
```

```
 Issued
```
#### Note 10

##### MarriedStatus Enumerations:

######  N/A

```
 Married
 NotMarried
 Refused
```
#### Note 11

##### ChangeNumbers

Change Numbers in PST represent a method of tracking what records were last changed. Each time a
record is updated, the Change Number value for that record is changed to the current max value + 1. This
can be used when syncing changes that have been made since your last API Call if you use the
GreaterThanChangeNumber parameter.

##### NOTE 12

##### JobStyle

There are currently 4 styles of Jobs in PST:
 Enhanced
o Allow Service Details to be entered on multiple Servee Details.
o Supports additional Recipient Description Values.
 Classic
o Only allows 1 set of Service Details.
o If there is not an “Actual Service” Servee Detail on the job, the Service Details will be
included with the Job Node. If there is an “Actual Service” Servee Detail, the Service
Details are included in that Servee Detail node.
 ManualInvoice
o Typically used to bill for non-process service jobs.
o No Servee Details.
o Use ServeeLastFirstMiddle and ServeeFullNameAndAddress.
 OldStyle
o No Servee Details.
o Use ServeeLastFirstMiddle and ServeeFullNameAndAddress.

#### Note 13

##### Servee Detail PartyType

The PartyType field is used to specify whether a ServeeDetail is a business or person.
 Enumerations:
o NaturalPerson
o Corporation
o NotSpecified

#### Note 14

##### ServeeStatus Enumerations:


```
 Attempting
 NoResponse
 TenantOccupied
 Vacant
 Moved
 BadAddress
 Served
 Other
 ReferenceOnly
 NonServed
 Ignore
 Cancelled
```
#### Note 15

##### MilitaryStatus Enumerations:

######  N/A

```
 No
 Yes
 Refused
```
#### Note 16

##### PricingMethod Enumerations:

```
 Not Used
 Zone Based Pricing
 Fixed Amount
 Percent of Service Fee
 Historical Pay
 Split Pay
 Tax 1
 Tax 2
 Late Fee

```
#### Note 17

##### RateType Enumerations:

```
 Not Used
 Fixed Amount
 Percentage
```
#### Note 18

##### PaymentMethod Enumerations:

```
 Not Specified
 Cash
 Check
 Credit Card
 Direct Deposit
 Other
```
#### Note 19


##### The Comments SortBy value is set by the PST User from the UI. It represents the Sort Order

##### last used by any user of the database.

#### Note 20

##### Priority Enumerations:

```
 MoneyIsNoObject
 PriorityService
 Rush
 Standard
 OnHoldPerClient
```
#### Note 21

##### ServerSelectMode Enumerations:

```
 All
 ServerSerialNumber
 FirmName
 LastName
```
#### Note 22

##### SortBy (Server Payables Report) Enumerations:

```
 JobNumber
 InvoiceDate
```
#### Note 23

##### ServerLocality Enumerations:

```
 Local
 NonLocal
```
#### Note 24

##### FileReturnType Enumerations:

```
 None
 OneFileForAllServers
 OneFileForEachServer
```
#### Note 25

#### Cases Search - ResultsOrderBy Enumerations:

```
 Default
 CaseNumber
 CaseChangeNumber
 Plaintiff
 Defendant
 CaseSerialNumber
```

#### Note 26

#### Jobs Search – ServeeSelectMode Enumerations:

```
 All
 Matched
```
#### Note 27

##### ResultsOffsetBy

Sets the number of rows to skip. ResultsOrderBy is required to use this property.

#### Note 28

#### InvoiceStatus Enumerations:

```
 All
 Unpaid
 Paid
```
#### Note 29

#### InvoicePrintedType Enumerations:

```
 All
 Printed
 Unprinted
```
#### Note 30

#### Invoices Search – ResultsOrderBy Enumerations:

```
 Default
 JobNumber
 DateSource (see Note 4)
```
#### Note 31

#### DocumentType Enumerations:

```
 Affidavit
 Invoice
 FieldSheet
```
#### Note 32

#### Servee Detail Address Type Enumerations:

```
 Other
 Home
 Work
```
#### Note 33

#### Comments Viewable By Search Enumerations:

```
 All (default)
 Client
o Only comments that have IsReviewed plus any one of the following set to true: IsAffidavit,
IsAttempt, IsInvoice, IsDiligence and IsStatusReport
 Server
o Only comments that have IsReviewed and IsFieldSheet both set to true.
```

#### Note 34

#### Attachments Viewable By Search Enumerations:

```
 All (default)
 Client
o Only attachments with ViewableByClient set to true are returned.
 Server
o Only attachments with ViewableByServer set to true are returned.
```

Changes
1.1.0.0
 CaseClientSpecifics Model
o Added property: Href (uri)
 CaseModel
o Added property: Court (CourtModel)
o Replaced Attachments (AttachmentModel[]) property with CaseAttachmentsCollection
(CollectionReference)
o Added property: CaseJobsReference (uri)
 CommentModel
o Added property: Source (string)
o Added property: ServeeDetailId (guid)
 EntityModel
o Added property: Href (uri)
o Removed Contacts property
o Added ContactsReference (uri) property
 JobModel
o Added property: InvoiceReference (uri)
o Added property: DefaultServer (EntityModel)
o Changed ServeeDetails type to CollectionReference
o Changed Attachments type to CollectionReference
o Changed Comments type to CollectionReference
o Changed JobServers type to CollectionReference
 ServeeDetailModel
o Changed Attachments type to CollectionReference
o Changed Comments type to CollectionReference
 Added Models for Court related data
o CourtModelBase
o CourtModel
 Added Models for Invoice related data
o InvoiceModel
o InvoiceLineItemModelBase
o InvoiceLineItemModel
o InvoicePaymentModelBase
o InvoicePaymentModel
 New GET Requests
o Servee Details Request
o Servee Detail Attachments Request
o Servee Detail Comments Request
o Servers Request
o Job Comments Request
o Case Attachments Request
o Invoice Request
o Payments Request
o Line Items Request
o Entity Contacts Request

1.1.0.6
 GET Requests
o Search Jobs Request
 Added parameter ResultsOffsetBy
o Search Cases Request


```
 Added parameter ResultsOffsetBy
o Invoice Request
 Added parameter GreaterThanChangeNumber
 Added parameter ResultsLimit
 Added parameter ResultsOrderBy
 Added parameter ResultsOrderIsDescending
 Added parameter ResultsOffsetBy
```
1.1.0.15
 JobModelBase
o Added Priority field
 CommentModel
o Added AuthorDBSCode & ServerSerialNumber fields

1.2.0.0

```
 New GET Request
o Server Payables Report
```
1.2.3.0

```
 Entity Search Request – SearchBy
o Added NotificationEmailAddress
o Added UserName
 EntityModelBase
o Added UserName
 UpdateEntityModel
o Added Password
```
1.2.4

```
 Reports – Server Payables
o Response no longer includes a file for the report. Instead a byte array is returned.
o Response now includes a breakdown of servers.
o Added parameter “FileReturnType”, which allows you to choose between receiving one
file for all server reports, or an individual file for each server.
```
1.2.5

```
 Added support for Classic Server Pay Report.
```
###### 1.2.6

```
 Creating and updating EntityContacts now supported.
o See “Create a New Entity Contact” and “Update an Existing Entity Contact”
 Assigning an Entity Contact to a Case is now supported (via CaseClientSpecifics).
 Added CreateContacts support when Updating or Creating a new Entity.
 Added PrePayOnly flag to EntityModelBase.
 Added a new optional parameter for UseLinkedResources to the Get Job Request.
o If false, the API will return individual items for Comments, JobServers & Attachments (in
addition to the Count & URI for the resource).
 Added JobType values for OldStyle & ManualInvoice (see Note 12).
```

```
 Added PartyToBeServedLastFirstMiddle and PartyToBeServedFullNameAndAddress to
JobModel (to help identify jobs that have a JobType of OldStyle or ManualInvoice).
```
1.2.7

```
 Added support for adding Invoice Line items to an Invoice (while creating or updating a Job).
 Added new Models: UpdateInvoiceModel & AddInvoiceLineItemModel
 Added Invoice property to CreateJobModel
 Added Invoice property to UpdateJobModel
 Added JobChangeNumber property to InvoiceModel
 Added “IncludeLineItems” Parameter when searching invoices.
 Add InvoiceModel member to JobModel. This node is returned if UseLinkedResources is false.
 Added EntityDefaultsToUse property to CreateEntityModel (tells the API to use default values
when creating a new Entity).
 Added Source property to CommentModelBase.
 Added Generate Documents endpoint.
 Added options for handling how documents are queued / attached when creating a new job (see
Queue Document Options page).
```
1.2.9

```
 Added ClientTradedJobNumber and ServerTradedJobNumber to JobModel
 Added ServerTradedJobNumber to ServeeDetailModel
```
1.2.10

```
 Added CaseSerialNumber Case Search ResultsOrderBy Enumeration
 Added CaseNumber parameter to Job Search
 Added CaseNumber parameter to Invoice Search
 Added InvoicePrintedType and InvoiceStatus parameters to job search.
```
1.2.11

```
 Added BatchInvoiceNumber parameter to job search.
```
1.2.13

```
 Added support for returning Comments with the Job Search response when the
useLinkedResources parameter is false.
 Added AddressType to Servee Detail Model Base.
```
1.2.14

```
 Added location data to ServiceDetailsModel
```
1.2.16

```
 Added CommentsViewableBy as parameter for retrieving a job.
 Added AttachmentsViewableBy as parameter for retrieving a job.
```

