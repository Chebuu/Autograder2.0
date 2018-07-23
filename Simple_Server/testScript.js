//Wait until page is fully loaded
$(document).ready(function(){
    /*This function is used to open the USB device, select the configuration, and 
    to select the interface. Await is followed with a promise. This means that the
    promise will carry out and the function will wait until that promised is fulfilled.
    You can store the value of this promise in a variable if desired.*/
    async function connectDev(device){
        console.log('Opening...');
        //This function will wait until the device is open
        await device.open();
        //Checks if the device is opened 
        if(!device.opened) 
            console.log('Could Not Open');
        else{
            console.log('Opened Successfully');
            //Check if the device is configured
            if (device.configuration == null){ 
                console.log('Selecting Configuration...');
                //The function waits until the configuration is set
                await device.selectConfiguration(1);
                console.log('Configuration Selected');
            }
            console.log('Claiming Intereface...');
            //The function waits until the interface is claimed
            await device.claimInterface(2);
            console.log('Interface Claimed');
        }
    }
    //------------------------------------------------------------------
    //CHANGED
    /*This function is used to receive data from device, function will return 
    the data received*/
    async function receiveData(device){
        //Make the device ready to receive data
        await device.controlTransferOut({
            requestType: 'class',
            recipient: 'interface',
            request: 0x22,
            value: 0x01,
            index: 0x02
        });
        console.log('Receiving Data...');
        //Waiting for 64bytes of data from endpoint #5, store that data in result
        let result = await device.transferIn(5,64);
        console.log('Data Received');
        //Decode and print the message
        let decoder = new TextDecoder();
        return decoder.decode(result.data);
        //console.log('Received: ' + decoder.decode(result.data)); CHANGEHERE
    }
    //-------------------------------------------------------------------
    /*This function is used to send data to the device, u_input is data to be sent*/
    async function sendData(device, u_input){
        //Make the device ready to send data
        await device.controlTransferIn({
            requestType: 'class',
            recipient: 'interface',
            request: 0x22,
            value: 0x01,
            index: 0x02
        }, 8);
        console.log('Sending Data...');
        //Waiting for 64bytes of data from endpoint #5, store that data in result
        var buffer = new ArrayBuffer(8);

        console.log('Sent a message.');
        let encoder = new TextEncoder();
        buffer = encoder.encode(u_input);
        await device.transferOut(5,buffer);
        console.log('Data Successfully Sent');
        //Decode and print the message
        /*let decoder = new TextDecoder();
        console.log('Sent: ' + decoder.decode(result.data));*/
        //await receiveData(device); //ONLY UNCOMMENT TO LINK SENDING AND RECEIVING DATA
    }

    //-------------------------------------------------------------------
    /*This function is used to close the device*/
    async function closeDev(device){
        console.log('Closing...')
        await device.close();
        if(device.opened)
            console.log('Device did not close');
        else
            console.log('Device closed');
    }

    //-------------------------------------------------------------------
    /*This function disables/enables all buttons*/
    function disableButtons(flag){
        $(':button').prop('disabled',flag); //Selects all buttons, sets diasabled to flag
    }

    //-------------------------------------------------------------------
    /*Used to check if there are devices alreay paired from before*/
    document.addEventListener('DOMContentLoaded', async () => {
        let devices = await navigator.usb.getDevices();
        devices.forEach(device => {
        console.log('Get Devices pass');// Add |device| to the UI.
        });
    });

    //-------------------------------------------------------------------
    /*Used to detect when a USB device is connected. NOTE: Connected means that
    a new USB device is connected to the PC, not that a device is opened by WebUSB.*/
    navigator.usb.addEventListener('connect', event => {
        console.log('Device connected');// Add |event.device| to the UI.
    });

    //-------------------------------------------------------------------
    /*Used to detect when a USB device is disconnected, look at note above.*/
    navigator.usb.addEventListener('disconnect', event => {
        console.log('Device disconencted');// Remove |event.device| from the UI.
    });

    //-------------------------------------------------------------------    
    /*Define all buttons/variables beforehand*/
    let receive = document.getElementById('request-device');
    let send = document.getElementById('send');
    let blinky2 = document.getElementById('blinky2');
    let blinky1 = document.getElementById('blinky1');
    let run = document.getElementById('test-cases');
    var SIG_FIG = 7;
    //-------------------------------------------------------------------
    /*Defining what happens when the receive button is clicked. This is meant
    to receive data from the test board and print to console*/

    //Check that the button exists
    if(receive){
        //What happens when the button is clicked
        $(receive).click(async() => {
            $('#demo').text('Paragraph changed');
            let device;
            try {
                disableButtons(true);
                //Have user select device
                device = await navigator.usb.requestDevice({filters: [{vendorId:0x1F00}]})
                //Connect the device
                await connectDev(device);
                //Receive data from device
                await receiveData(device);
                //await receiveData(device);
                //await receiveData(device);
                //await receiveData(device);
                //await receiveData(device);
                //await closeDev(device); 
            } catch (err){
                console.log('No Device was selected in receive');//No device was selected.
            }
            disableButtons(false);
        })
    }

    //-------------------------------------------------------------------
    /*Defines what happens when the send button is clicked. This is used to 
    send period and duty cycle (user input) to the test board and then receive the time 
    stamps measured by the test baord for the period and duty cycle.*/
    if(send){
        $(send).click(async() => {
            $('#demo').text("Entered Here");
            let device;
            //Get values period and duty cycle entered by usert
            var period = $('#per').val();
            var dutyCycle = $('#dutyCycle').val();            
            try{
                //Select device
                disableButtons(true);
                device = await navigator.usb.requestDevice({filters: [{vendorId:0x1F00}]})
                await connectDev(device);
                //Send period and duty cycle to device
                await sendData(device,period); //Currently, sendData also receives data to test it
                await sendData(device,dutyCycle);
                //Receive period and duty cycle measured from test board
                await receiveData(device);
                await receiveData(device);
                await closeDev(device);
            } catch(err){
                console.log('No Device was selected' + err);
            }
            disableButtons(false);
        })
    }

    //-------------------------------------------------------------------
    /*Defines what happens when Download Blinky2 button is clicked. This 
    downloads a program that simply causes LED1 to blink. Transferring this file 
    should cause the test baord to reset itself.*/
    if(blinky2){
        $(blinky2).click(async()=>{
            let device;
            try{
                disableButtons(true);
                //Select the device
                device = await navigator.usb.requestDevice({filters: [{vendorId:0x1F00}]})
                await connectDev(device);
                console.log("blinky2");
                //Send RESET to the testboard to have the testboard reset itself
                await sendData(device, 'RESET');
                console.log('sent');
                await closeDev(device);
            }
            catch(err){
                console.log(err);
            }
            disableButtons(false);
        })
    }

    //-------------------------------------------------------------------
    /*Defines what happens when Download Blinky button is clicked. This
    downloads a program that simply causes LED3 to blink. Transferring this file 
    should cause the test baord to reset itself.*/
    if(blinky1){
        $(blinky1).click(async()=>{
            let device;
            try{
                disableButtons(true);
                //Select the device
                device = await navigator.usb.requestDevice({filters: [{vendorId:0x1F00}]})
                await connectDev(device);
                console.log("blinky1");
                //Send RESET to test board to have it reset itself
                await sendData(device, 'RESET');
                console.log('sent');
                await closeDev(device);
            }
            catch(err){
                console.log(err);
            }
            disableButtons(false);
        })
    }

    //-------------------------------------------------------------------
    /*This is used to several test cases to the test board. The test cases are sent
    and then the time stamps are received by the test board. These time stamps are 
    formatted to be displayed on the browser.*/
    //BUTTON FUNCTIONALITY
     if (run){
        $(run).click(async () => {
            let device;
            //Define all periods and duty cycles in binary
            var per1 = '01111';
            var duty1 = '0110010';
            var per2 = '01011';
            var duty2 = '1000110';
            var per3 = '10110';
            var duty3 = '1011010';
            var per4 = '11110';
            var duty4 = '0001010';
            var per5 = '00010';
            var duty5 = '0010001';
            var list = [per1, duty1, per2, duty2, per3, duty3, per4, duty4, per5, duty5];
            var results = [];
            var index = 1;  //Keeps track of what test case we are on
            disableButtons(true);

            try{
            device = await navigator.usb.requestDevice({filters: [{vendorId:0x1F00}]})
            for(var i=0; i<10; i+=2){
                await connectDev(device);

                //Send period followed by duty cycle to test board
                await sendData(device, list[i]);
                await sendData(device, list[i+1]);

                //Store time stamp of period then duty cycle to results
                results[i] = await receiveData(device);
                results[i+1] = await receiveData(device);

                //Convert results into floats
                var per = (parseFloat(results[i]) * 1000).toFixed(SIG_FIG);; //Convert from seconds to ms
                var dCycle = (parseFloat(results[i+1]) * 100).toFixed(SIG_FIG); //Convert from decimal to percentage

                $(document.body).append('<div>Test Case: ' + index + '</div>' +
                    '<div>Period received: ' + per + 'ms</div>' +
                    '<div>Duty Cycle received: ' + dCycle + '%</div><br>');
                index++;
            }
        }
        catch(err){
            console.log(err);
        }
            index = 1; //Reset index for next time
            disableButtons(false);
            console.log(results.toString()); //Print raw time stamps to console


        })
     }

})

var numCycles = 10;
    function graphPlotly(period, dutyCycle, id){
        let test = document.getElementById(id);
        var xAxis = [];
        var yAxis = [];
        var sumX = 0;
        var sumY = 0;
        for(var i=0; i<numCycles;++i){
            xAxis.push(period*(i));
            xAxis.push(period*(i) + period*dutyCycle);
            xAxis.push(period*(i) + period*dutyCycle);
            xAxis.push(period*(i+1));
        }
        for(var i=0;i<numCycles/2;++i)
        {
            yAxis.push(1);
            yAxis.push(1);
            yAxis.push(0);
            yAxis.push(0);
        }
        /*
        var testTrace = {
            x: [0, 10, 10, 20, 20],
            y: [1, 1, 0, 0, 1],
        };
        */ 
        Plotly.plot(test, [{
            x: xAxis,
            y: yAxis 
            }],
            {margin: {t:0}}    
        );
    }
    
    let anotherTest = document.getElementById('plotly-test');
    if(anotherTest){
        anotherTest.addEventListener('click', async () => {
            
            
            var period = 10;
            var duty = 0.4;
            id = 'tester';
            graphPlotly(period, duty, id);  //THIS IS THE FUNCTION YOU USE TO PLOT IT
            
        })
    }