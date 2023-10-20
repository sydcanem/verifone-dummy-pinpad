const net = require('net');

function cleanPayload(inputPayload) {
  // Remove all non-printable ASCII characters and control characters
  return inputPayload.replace(/[^ -~]/g, '');
}

// POS will poll for result but we will wait until PT (receipt)
// is sent to POS before we send RS APPROVED
let sendResponseSuccess = false;

const server = net.createServer((socket) => {
  console.log('Client connected');

  socket.on('data', (data) => {
    const payload = cleanPayload(data.toString().trim()); // Convert buffer to string and remove leading/trailing whitespace
    console.log(`Received payload: ${payload}`);
  
    let terminalSentPayload = '';

    if (payload === 'V2CP?,ON') { // Configure printing?
      terminalSentPayload = '   CP,ON'; // Printing ON
    } else if (payload.startsWith('V2PR')) { // Purchase plus Cash
      terminalSentPayload = '   RP?=,0'; // Ready to print?
    } else if (payload.startsWith('V2RP,OK')) { // Printer ready
      terminalSentPayload = '   PT?,\nPTAK\nVERIFONE PTAK\nFHDR \'PTAK0001\'\n*-------EFTPOS-------*\nDATE:          19OCT23\nTIME:            16:59\nMID:       10002030091\nTID:          00203091\nTRAN:           CHEQUE\n002486\nEFTPOS\nCARD:         ....1111\nPURCHASE     NZ$ 21.00\nTOTAL        NZ$ 21.00\n       ACCEPTED\n*--------------------*\nINVOICE NUM     000226\n    CUSTOMER COPY       ';
    } else if (payload.startsWith('V2GR')) {
      terminalSentPayload = '   GR,\nPTAK\nVERIFONE PTAK\nFHDR \'PTAK0001\'\n*-------EFTPOS-------*\nDATE:          19OCT23\nTIME:            16:59\nMID:       10002030091\nTID:          00203091\nTRAN:           CHEQUE\n002486\nEFTPOS\nCARD:         ....1111\nPURCHASE     NZ$ 21.00\nTOTAL        NZ$ 21.00\n       ACCEPTED\n*--------------------*\nINVOICE NUM     000226\n    CUSTOMER COPY       ';
    } else if (payload.startsWith('V2PT,OK')) { // POS printed receipt
      // I'm not sure what to respond to POS if printing was OK, so we just respond with pending RS
      terminalSentPayload = '   RS,1,0,??,PROCESSING,UNKNOWN,N/A';
      sendResponseSuccess = true;
    } else if (payload.startsWith('V2RS')) {
      if (sendResponseSuccess) terminalSentPayload = '   RS,1,0,00,APPROVED,EFTPOS,ONLINE';
      else terminalSentPayload = '   RS,1,0,??,PROCESSING,UNKNOWN,N/A';
    } else if (payload === 'V2CP?,OFF') {
      terminalSentPayload = '   CP,OFF'; // Pinpad is OFF
    }

    console.log(`Responding with: '${terminalSentPayload}'`);
    socket.write(`'${terminalSentPayload}'`);
  });

  socket.on('end', () => {
    sendResponseSuccess = false;
    console.log('Client disconnected');
  });
});

const port = 8888;
server.listen(port, () => {
  console.log(`TCP server listening on port ${port}`);
});
