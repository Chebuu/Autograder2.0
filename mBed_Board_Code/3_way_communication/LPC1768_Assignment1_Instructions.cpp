#include "mbed.h"
#include "USBSerial.h"
#include "WebUSBCDC.h"

#include <string>
#include <sstream>
#include <iomanip>

//Needed for read buffer
#define MAX_BUF_SIZE (1024)
#define NUM_PERIOD_PINS (5)
#define NUM_DUTY_CYCLE_PINS (7)
#define SIG_FIGS (10)
#define MIN_TIME_UNIT (.0002) //ms
#define NUM_TIME_UNITS (25000)
#define RECORDING_TIME (MIN_TIME_UNIT * NUM_TIME_UNITS)

//LED's
DigitalOut led1(LED1);
DigitalOut led2(LED2);
DigitalOut led3(LED3);

//PWM Pins
InterruptIn PWM_API(p27); //Using built in function
DigitalIn PWM_MANUAL(p25); //Using toggling

DigitalOut req(p21); //Tells F7 to start generating waves

//Period Pins
DigitalOut MSP(p5); //Most significant bit for period
DigitalOut P2(p6);
DigitalOut P3(p7);
DigitalOut P4(p8);
DigitalOut LSP(p9); //Least significant bit for period
DigitalOut perList[] = {MSP, P2, P3, P4, LSP}; //List of period pins

//Duty Cycle Pins
DigitalOut MSD(p11); //Most significant bit for duty cycle
DigitalOut DC2(p12);
DigitalOut DC3(p13);
DigitalOut DC4(p14);
DigitalOut DC5(p15);
DigitalOut DC6(p16);
DigitalOut LSD(p17); //Least significant bit for duty cycle
DigitalOut dutyList[] = {MSD, DC2, DC3, DC4, DC5, DC6, LSD}; //List of duty cycle pins

//For Debugging, terminal output
Serial pc(USBTX, USBRX);

//Helper Function Prototypes; Definitions below main
void assignmentOne(void);
int readCommand(void);
void sendError(void);
void sendBinary(uint8_t buffer[], DigitalOut list[], int size);
void time(float &period, float &duty);
void convertFloatToBuf(float num, uint8_t buf[], int sigFigs);
void writeToBrowser(uint8_t buffer[]);
void readDataFromBrowser(uint8_t * buffer, uint32_t & len);
//static_cast<int>(n >= 0 ? n + 0.1 : n - 0.1)  WILL CAST PERIOD TO INT IF WANTED

//USB object
WebUSBCDC webUSB(0x1F00,0x2012,0x0001, false);

int main() 
{
    while(1) 
    {
        int choice = readCommand();
        if(choice == 0)
        {
            //pc.printf("Assignment one\r\n");
            assignmentOne();
        }
        else if(choice == 1)
            led1 = !led1;
        else if(choice == 2)
            led2 = !led2;
        else if(choice == 3)
            led3 = !led3;
        else
        {
            pc.printf("Command failed. Choice is %d \r\n", choice);
        }
        
    }
}
//-----------------------------------------------------------
void assignmentOne(void)
{
    float period = 0;
    float duty = 0;
    uint32_t lenPer, lenDuty; //Leave undeclared, or else read function will not work
    uint8_t * perBuf1, * dutyBuf1;
    perBuf1 = new uint8_t[MAX_BUF_SIZE]; //Dynamically allocated because read function prefers it
    dutyBuf1 = new uint8_t[MAX_BUF_SIZE];
    readDataFromBrowser(perBuf1, lenPer); //Storing binary from browser into buffer
    readDataFromBrowser(dutyBuf1, lenDuty);
    sendBinary(perBuf1, perList, NUM_PERIOD_PINS); //Sends data for other board to interpret
    sendBinary(dutyBuf1, dutyList, NUM_DUTY_CYCLE_PINS);
    req = 1; //Send signal for other board to generate waves
    time(period, duty); //Period and duty cycle will be returned by reference
    req = 0; //Set signal to 0 so that it can rise again
    delete [] perBuf1; //Deallocating memory
    delete [] dutyBuf1;
    perBuf1 = 0; //Dereference pointers
    dutyBuf1 = 0; 
    if(period<=0)//Period is returned as -1 if a timeout error occurs
    {
        sendError();
    }
    else
    {
        uint8_t *perBuf, *dutyBuf; 
        perBuf = new uint8_t[SIG_FIGS];
        dutyBuf = new uint8_t[SIG_FIGS];
        convertFloatToBuf(period, perBuf, SIG_FIGS);
        convertFloatToBuf(duty, dutyBuf, SIG_FIGS);
        writeToBrowser(perBuf);
        writeToBrowser(dutyBuf);
        delete [] perBuf; //Deallocate memory
        delete [] dutyBuf;
        perBuf = 0; //Dereference pointers
        dutyBuf = 0;
    }
}
//-----------------------------------------------------------
void sendBinary(uint8_t buffer[], DigitalOut list[], int size) //Function that sends signals to student board
{
    for(int i=0; i<size; ++i)
    {
        if(buffer[i] == '1')
        {
            list[i] = 1;//Corresponding bit pin is ON
        }
        else
            list[i] = 0;//Corresponding bit pin is OFF
    }
}
//-----------------------------------------------------------
void time(float &period, float &duty) //Function that times board
{
    Timer onTime;
    Timer totTime;
    Timer timeOut;
    int numCycles = 0;
    timeOut.start(); //Start time out so that it can count while waiting for a fresh cycle
    pc.printf("Starting timing\r\n");
    while (!PWM_API.read() && timeOut.read() < 5.0){}
    while (PWM_API.read() && timeOut.read() < 5.0){} //These loops ensure that timing begins on a fresh cycle
    timeOut.stop();
    pc.printf("Got here. Timeout is %f\r\n",timeOut.read());
    if(timeOut.read() <= 4.9)
    {
        while (!PWM_API.read() && timeOut.read() < 10.0){}
        while (PWM_API.read() && timeOut.read() < 10.0){}
        totTime.start();
        while(totTime.read() < RECORDING_TIME)
        {
            while(!PWM_API.read()){}
            onTime.start();
            while(PWM_API.read()){}
            onTime.stop();
            numCycles += 1;
        }
        pc.printf("Made it here\r\n");
        totTime.stop();
        period = totTime.read() / numCycles;
        duty = onTime.read() / totTime.read();
    }
    else
    {
        pc.printf("Error. Timeout occurred.\n\r");
        period = -1.0;
    }
}
//-----------------------------------------------------------
void convertFloatToBuf(float num, uint8_t buf[], int sigFigs) //Converts a float to a uint8_t buffer to send
{
    ostringstream oss;
    oss << setprecision(sigFigs);
    oss << num;
    string key = oss.str(); //Converts float to string first
    for(int i=0;i<sigFigs;++i)
    {
        buf[i] = static_cast<uint8_t>(key[i]);
    }
}
//----------------------------------------------------------
void writeToBrowser(uint8_t buffer[]) //Sends data to the browser
{
    bool isFinished = false;
    while(!isFinished)
    {
        if(!webUSB.configured())
            webUSB.connect();
        if(webUSB.configured() && webUSB.write(buffer,SIG_FIGS))
        {
            isFinished = true;
        }
    }
}
//----------------------------------------------------------
void readDataFromBrowser(uint8_t *buffer, uint32_t & len) //Reads data from browser into buffer
{   
    bool read = false;
    while(!read)
    {
        if (!webUSB.configured()) 
        {
            webUSB.connect();
        }   
        if(webUSB.configured() && webUSB.read(buffer, &len))
        {
            read = true;
        } 
    }
}
//----------------------------------------------------------
int readCommand(void)//receives the necessary command  
{   
    uint32_t len; //Leave undeclared, or else read function will not work
    uint8_t * commandBuf;
    commandBuf = new uint8_t[MAX_BUF_SIZE]; //Dynamically allocated because read function prefers it
    readDataFromBrowser(commandBuf, len);
    int choice = static_cast<int>(commandBuf[0]) - '0'; //Subtracting ascii value of 0 to get integer value
    delete [] commandBuf;
    commandBuf = 0;
    return choice;
}
//----------------------------------------------------------
void sendError(void)
{
    pc.printf("In error function\r\n");
    uint8_t *errBuf1, *errBuf2;
    errBuf1 = new uint8_t[MAX_BUF_SIZE];
    errBuf2 = new uint8_t[MAX_BUF_SIZE];
    string timeout = "TIMEOUT ";
    string error = "ERROR!!!";
    for(int i = 0;i < timeout.length();++i)
        errBuf1[i] = static_cast<uint8_t>(timeout[i]);
    for(int i = 0;i < error.length();++i)
        errBuf2[i] = static_cast<uint8_t>(error[i]);
    writeToBrowser(errBuf1);
    writeToBrowser(errBuf2);
    delete [] errBuf1;
    delete [] errBuf2;
    errBuf1 = 0;
    errBuf2 = 0;
}