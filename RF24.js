var C = {
  // Registers
  CONFIG      : 0x00,
  EN_AA       : 0x01,
  EN_RXADDR   : 0x02,
  SETUP_AW    : 0x03,
  SETUP_RETR  : 0x04,
  RF_CH       : 0x05,
  RF_SETUP    : 0x06,
  STATUS      : 0x07,
  OBSERVE_TX  : 0x08,
  CD          : 0x09,
  RX_PW_P0    : 0x11,
  RX_PW_P1    : 0x12,
  RX_PW_P2    : 0x13,
  RX_PW_P3    : 0x14,
  RX_PW_P4    : 0x15,
  RX_PW_P5    : 0x16,
  FIFO_STATUS : 0x17,
  DYNPD : 0x1C,
  FEATURE : 0x1D,

  // Bits
  MASK_RX_DR  : 1<<6, // CONFIG
  MASK_TX_DS  : 1<<5,
  MASK_MAX_RT : 1<<4,
  EN_CRC      : 1<<3,
  CRCO        : 1<<2,
  PWR_UP      : 1<<1,
  PRIM_RX     : 1<<0,
  ENAA_P5     : 1<<5, // EN_AA
  ENAA_P4     : 1<<4,
  ENAA_P3     : 1<<3,
  ENAA_P2     : 1<<2,
  ENAA_P1     : 1<<1,
  ENAA_P0     : 1<<0,
  AW          : 1<<0, // SETUP_AW
  ARD         : 1<<4, // SETUP_RETR
  ARC         : 1<<0,
  PLL_LOCK    : 1<<4, // RF_SETUP
  RF_DR_HIGH  : 1<<3,
  RF_DR_LOW   : 1<<5,
  RF_PWR      : 1<<1,
  RX_DR       : 1<<6, // STATUS
  TX_DS       : 1<<5,
  MAX_RT      : 1<<4,
  RX_P_NO     : 1<<1,
  RX_P_NO_FIFO_EMPTY : 7<<1,
  TX_FULL     : 1<<0,
  PLOS_CNT    : 1<<4, // OBSERVE_TX
  ARC_CNT     : 1<<0,
  TX_REUSE    : 1<<6, // FIFO_STATUS
  FIFO_FULL   : 1<<5,
  TX_EMPTY    : 1<<4,
  RX_FULL     : 1<<1,
  RX_EMPTY    : 1<<0,
  DPL_P5      : 1<<5,
  DPL_P4      : 1<<4,
  DPL_P3      : 1<<3,
  DPL_P2      : 1<<2,
  DPL_P1      : 1<<1,
  DPL_P0      : 1<<0,
  EN_DPL      : 1<<2,
  EN_ACK_PAY  : 1<<1,
  EN_DYN_ACK  : 1<<0,

  // Instructions
  R_REGISTER    : 0x00,
  W_REGISTER    : 0x20,
  REGISTER_MASK : 0x1F,
  ACTIVATE      : 0x50,
  R_RX_PL_WID   : 0x60,
  R_RX_PAYLOAD  : 0x61,
  W_TX_PAYLOAD  : 0xA0,
  FLUSH_TX      : 0xE1,
  FLUSH_RX      : 0xE2,
  REUSE_TX_PL   : 0xE3,
  NOP           : 0xFF,
  LNA_HCURR     : 0,
  RPD           : 0x09,
  W_TX_PAYLOAD_NO_ACK  : 0x80,
  RF_PWR_LOW    : 1,
  RF_PWR_HIGH   : 2,
  RF24_PA_MIN   : 0,
  RF24_PA_LOW   : 1,
  RF24_PA_HIGH  : 2,
  RF24_PA_MAX   : 3,
  RF24_PA_ERROR : 4,
  RF24_1MBPS    : 0,
  RF24_2MBPS    : 1,
  RF24_250KBPS  : 2,
  RF24_CRC_DISABLED : 0,
  RF24_CRC_8 : 1,
  RF24_CRC_16 : 2,
  child_pipe_enable : [1<<0,1<<1,1<<2,1<<3,1<<4,1<<5]
};


//Initialise radio object
function RF24(_spi, _csn, _ce, _payload) {
  this.CSN = _csn;
  this.CE = _ce;
  this.PAYLOAD = (typeof _payload === 'undefined') ? 32 : _payload;
  this.PAYLOAD = 32;
  this.spi = _spi;
  this.p_variant = 0;
  this.DYNAMIC = 0;
  this.address_width = 5;
  this.pipe0_reading_address = [0,0,0,0,0];
//TODO  this.cmd = ""; // for receiving commands
//TODO  this.callbacks = []; // array of callbacks
}

/** Public constants */
RF24.C = {
  RX_ADDR_P0  : 0x0A,
  RX_ADDR_P1  : 0x0B,
  RX_ADDR_P2  : 0x0C,
  RX_ADDR_P3  : 0x0D,
  RX_ADDR_P4  : 0x0E,
  RX_ADDR_P5  : 0x0F,
  TX_ADDR     : 0x10
};


// public -------------------------------------------

//DONE
//Initialise the module - has a timeout
RF24.prototype.begin = function(callback) {
  
  this.ce(0);
  this.ce(1);
  
  //Delay 5 milliseconds
  setTimeout(function() {
  
    this.write_register(C.CONFIG,C.EN_CRC|C.CRCO);
    this.setRetries(5,15);

    if( this.setDataRate(C.RF24_250KBPS) );
    {
      this.p_variant = true;
    }

    this.setDataRate( C.RF24_1MBPS );
    
    this.toggle_features();
    this.write_register(C.FEATURE,0);
    this.write_register(C.DYNPD,0);
    this.write_register(C.STATUS,C.RX_DR | C.TX_DS | C.MAX_RT);
    this.setChannel(76);
    this.flush_rx();
    this.flush_tx();

    this.powerUp(function(){
      this.write_register(C.CONFIG,this.read_register(CONFIG) & ~C.PRIM_RX);
      callback();
    });
  },5);  
};


//DONE
RF24.prototype.startListening = function(){
  this.powerUp(function(){
    
    this.write_register(C.CONFIG,this.read_register(C.CONFIG)|C.PRIM_RX);
    this.write_register(C.STATUS,C.RX_DR | C.TX_DS | C.MAX_RT);
    this.ce(1);

    if(this.pipe0_reading_address)[0] > 0){
      this.write_register(C.RX_ADDR_P0,this.pipe0_reading_address,this.address_width);
    } else {
      this.closeReadingPipe(0);
    }
    
    if(this.read_register(C.FEATURE) & C.EN_ACK_PAY){
      this.flush_tx();
    }
  });
};

//DONE
RF24.prototype.stopListening = function(){
  this.ce(0);
  this.delayMicro(this.txRxDelay);
  if(this.read_register(C.FEATURE)&C.EN_ACK_PAY){
    this.delayMicro(this.txRxDelay);
    this.flush_tx();
  } 
  this.write_register(C.CONFIG,(this.read_register(C.CONFIG))&~C.PRIM_RX);
  this.write_register(C.EN_RXADDR,this.read_register(C>EN_RXADDR)|C.child_pipe_enable[0])
};

//DONE
RF24.prototype.read = function(data){
  this.read_payload(data);
  this.write_register(C.STATUS,C.RX_DR|C.MAX_RT|C.TX_DS);
};

//DONE
RF24.prototype.openWritingPipe = function(address){
  this.write_register(this.C.RX_ADDR_P0,address);
  this.write_register(this.C.TX_ADDR,address);
  this.write_register(C.RX_PW_P0,this.PAYLOAD);
};

//TODO
RF24.prototype.openReadingPipe = function(child,address){
  if(child===0){
    //TODO memcpy
  }
  if (child<=0) {
    if(child<2){
      //TODOthis.write_register()
    }else{
      //TODO
    }
//TODO
//TODO this.write_register(C.EN_RXADDR,this.read_register(C.EN_RXADDR)|C)
  }
};



//TODO - Not sure what this is doing with pipe_num
RF24.prototype.available = function(pipe_num){
  if(typeof pipe_num === 'undefined'){pipe_num = NULL;}
  if(!(this.read_register(C.FIFO_STATUS) & C.RX_EMPTY)){
    if(pipe_num){
      var status = this.get_status();
      
      //pipe_num = (status >> C.RX_P_NO) & parseInt("0111", 2);
    }
    return 1;
  }
  return 0;
};

//DONE
RF24.prototype.rxFifoFull = function(){
  return this.read_register(C.FIFO_STATUS) & C.RX_FULL;
};
      
//DONE
/** Put radio in low power mode - no tx/rx*/
RF24.prototype.powerDown = function(){
  this.ce(0);
  this.write_register(C.CONFIG,read_register(C.CONFIG) & ~C.PWR_UP);
};

//DONE
/** Leave low power mode - required to rx/tx*/
RF24.prototype.powerUp = function(callback){
  if(!(this.read_register(C.CONFIG) & C.PWR_UP)) {
    setTimeout(callback(),5);
  }
};

//TODO
RF24.prototype.write = function(buf,len,multicast){
  if (typeof multicast === 'undefined') { multicast = 0; }
  this.startFastWrite(buf,len,multicast);
  while(!(this.get_status() & (C.TX_DS|C.MAX_RT))){}
  this.ce(0);
  if ( this.write_register(C.STATUS,C.RX_DR | C.TX_DS | C.MAX_RT) & C.MAX_RT) {
    this.flush_tx();
    return 0;
  }
  return 1;

};

//DONE
RF24.prototype.writeFast = function(buf,len,multicast){
  if (typeof multicast === 'undefined') { multicast = 0; }
  while((this.get_status() & (C.TX_FULL))){
    if(this.get_status() & C.MAX_RT){
      this.write_register(C.STATUS,C.MAX_RT);
      return 0;
    }
  }
  this.startFastWrite(buf,len,multicast);
  return 1;
};

//DONE
RF24.prototype.writeBlocking = function(buf,len,timeout){
  var timer = getTime();
  while(this.get_status() & C.TX_FULL) {
    if(this.get_status()&C.MAX_RT) {
      reUseTX();
      if(getTime() - timer > (timeout+0.085)){
        this.errNotify();
        return 0;
      }
    }
  }
  this.startFastWrite(buf,len,0);
  return 1;
};

//DONE
RF24.prototype.txStandBy = function(timeout,startTx){
  if(typeof timeout === 'undefined') {
    while(!(this.read_register(C.FIFO_STATUS))&C.TX_EMPTY){
      if(this.get_status() & C.MAX_RT){
        this.write_register(C.STATUS,C.MAX_RT);
        this.ce(0);
        this.flush_tx();
        return 0;
      }
    }
    this.ce(0);
    return 1;
  } else {
    if(startTx){
      this.stopListening();
      this.ce(1);
    }
    var start = getTime();
    while(!(this.read_register(C.FIFO_STATUS) & C.TX_EMPTY)){
      if(this.get_status() & C.MAX_RT){
        this.write_register(C.STATUS,C.MAX_RT);
        this.ce(0);
        this.ce(1);
        if(getTime() - start >= timeout/1000){
          this.ce(0);
          this.flush_tx();
          return 0;
        }
      }
    }
    this.ce(0);
    return 1;
  }
};

//TODO
RF24.prototype.writeAckPayload = function(pipe,buf,len){

};

//DONE
RF24.prototype.enableDynamicAck = function(){
  this.write_register(C.FEATURE,this.read_register(C.FEATURE)|C.EN_DPL);
  //IF serial debug print
  this.write_register(C.DYNPD,c,read_register(C.DYNPD)|C.DPL_P5|C.DPL_P4|C.DPL_P3|C.DPL_P2|C.DPL_P1|C.DPL_P0);
  this.DYNAMIC = true;
};

//DONE
RF24.prototype.isAckPayloadAvailable = function(){
  return !(this.read_register(C.FIFO_STATUS&C.RX_EMPTY));
};

//DONE
RF24.prototype.startFastWrite = function(buf,len,multicast,startTx){
  write_payload(buf,len,multicast ? C.W_TX_PAYLOAD_NO_ACK:C.W_TX_PAYLOAD);
  if(startTx){
    this.ce(1);
  }
};

//DONE
RF24.prototype.startWrite = function(buf,len,multicast,callback){
  write_payload(buf,len,multicast ? C.W_TX_PAYLOAD_NO_ACK:C.W_TX_PAYLOAD);
  this.ce(1);
  setTimeout(function() {
    this.ce(0);
    callback();
  },0.01);
};

//DONE
RF24.prototype.reUseTX = function(){
  this.write_register(C.STATUS,C.MAX_RT);
  this.spiTrans(C.REUSE_TX_PL);
  this.ce(0);
  this.ce(1);
};


//DONE
RF24.prototype.maskIRQ = function(tx,fail,rx){
  this.write_register(C.CONFIG,(this.read_register(C.CONFIG))|fail << C.MASK_MAX_RT|tx << C.MASK_TX_DS | rx << C.MASK_RX_DR);
};

//DONE - removed the if statement, not sure what it was for atm.  
RF24.prototype.setAddressWidth = function(a_width){
  a_width -=2;
  this.write_register(C.SETUP_AW,a_width%4);
  this.address_width = (a_width%4)+2;
  
};
//TODO - work out how pipes work
RF24.prototype.closeReadingPipe = function(){
  this.write_register(C.EN_RXADDR,this.read_register(C.EN_RXADDR) & ~this);
};

//DONE
RF24.prototype.setRetries = function(delay,count){
  this.write_register(C.SETUP_RETR,(delay&0xf)<<C.ARD | (count&0xf)<<C.ARC);
};

RF24.prototype.setChannel = function(){};

//DONE
RF24.prototype.setPayloadSize = function(size){
  this.PAYLOAD = Math.min(size,32);
};

//DONE
RF24.prototype.getPayloadSize = function(){
  return this.PAYLOAD;
};

//DONE
RF24.prototype.getDynamicPayloadSize = function(callback){
  var result = this.spi.send([C.R_RX_PL_WID, 0xff], this.CSN)[1];
  if(result > 32) {
    this.flush_rx();
    setTimeout(callback(0),0.002);
  }
  callback(result);
};

//DONE
RF24.prototype.enableAckPayload = function(){
  this.write_register(C.FEATURE,this.read_register(C.FEATURE)|C.EN_ACK_PAY|C.EN_DPL);
  this.write_register(C.DYNPD,this.read_register(C.DYNPD)|C.DPL_P1|C.DPL_P0);
  this.DYNAMIC = true;

};

//DONE
RF24.prototype.enableDynamicPayloads = function(){
  this.write_register(C.FEATURE,this.read_register(C.FEATURE) | C.EN_DPL);
  this.write_register(C.DYNPD,this.read_register(C.DYNPD)|C.DPL_P5|C.DPL_P4|C.DPL_P3|C.DPL_P2|C.DPL_P1|C.DPL_P0);
  this.DYNAMIC = true;
};

//DONE
RF24.prototype.isPVariant = function(){
  return this.p_variant;
};

//TODO
RF24.prototype.setAutoAck = function(enable,pipe){
  if(typeof pipe === 'undefined'){
    if(enable){
      this.write_register(C.EN_AA,parseInt("0111111", 2));
    } else {
      this.write_register(C.EN_AA,0);
    }
  } else {
    if(pipe<=6) {
      var en_aa = this.read_register(C.EN_AA);
      if(enable){
        //TODO en_aa |=
      } else {
        //TODO en_aa |=
      }
      this.write_register(C.EN_AA,en_aa);
    }
  }
};

//DONE
RF24.prototype.setPALevel = function(level){
  var setup = this.read_register(C.RF_SETUP) &  parseInt("011111000",2);
  if(level > 3){
    level = (C.RF24_PA_MAX << 1) + 1;
  } else {
    level = (level << 1) + 1;
  }
  this.write_register(C.RF_SETUP,setup |= level);
};

//DONE
RF24.prototype.setDataRate = function(speed){
  var result = false;
  var setup = this.read_register(C.RF_SETUP);
  setup &= ~(C.RF_DR_LOW|C.RF_DR_HIGH);
  this.txRxDelay=250;
  if(speed == C.RF24_250KBPS){
    setup |= C.RF_DR_LOW;
    this.txRxDelay=450;
  } else {
    if(speed==C.RF24_2MBPS){
      setup |= C.RF_DR_HIGH;
      this.txRxDelay = 190;
    }
  }
  this.write_register(C.RF_SETUP,setup);
  if(this.read_register(C.RF_SETUP)==setup){
    result = true;
  }
  return result;
};

//DONE
RF24.prototype.getDataRate = function(){
  var result;
  var dr = this.read_register(C.RF_SETUP)&(C.RF_DR_LOW|C.RF_DR_HIGH);

  if(dr == C.RF_DR_LOW){
    result = C.RF24_250KBPS;
  } else if (dr == C.RF_DR_HIGH){
    result = C.RF24_2MBPS;
  } else {
    result = C.RF24_1MBPS;
  }
  return result;
};

//DONE
RF24.prototype.setCRCLength = function(length){
  var config = this.read_register(C.CONFIG)&~(C.CRCO|C.EN_CRC);
  if(length==C.RF24_CRC_DISABLED){

  } else if(length == C.RF24_CRC_8) {
    config |= C.EN_CRC;
  } else {
    config |= C.EN_CRC;
    config |= C.CRCO;
  }
  this.write_register(C.CONFIG,config);
};

//DONE
RF24.prototype.getCRCLength = function(){
  var result = C.RF24_CRC_DISABLED;
  var config = this.read_register(C.CONFIG) & (C.CRCO|C.EN_CRC);
  var AA = this.read_register(C.EN_AA);

  if(config & C.EN_CRC || AA){
    if (config & C.CRCO) {
      result = C.RF24_CRC_16;
    } else {
      result = C.RF24_CRC_8;
    }
  }
  return result;
};

//DONE
RF24.prototype.disableCRC = function(){
  var disable = this.read_register(C.CONFIG)& ~ C.EN_CRC;
  this.write_register(C.CONFIG,disable);
};



//DONE - alternative arguments not needed?
RF24.prototype.write_register = function(reg,value){
  return this.spi.send([C.W_REGISTER | (C.REGISTER_MASK & reg), value], this.CSN);
};

//TODO - alternative arguments
RF24.prototype.read_register = function(reg){
  return this.spi.send([C.R_REGISTER | (C.REGISTER_MASK & reg), 0], this.CSN)[1];
};

//DONE
RF24.prototype.write_payload = function(data,writeType){
  var data_len = Math.min(value.length,this.PAYLOAD);
  var blanks = new Array(this.PAYLOAD - data_len);
  data = Array.concat(value,blanks);
  data.splice(0,0,writeType);
  return this.spi.send(data, this.CSN);
};

//DONE
RF24.prototype.read_payload = function(data){
  data = [C.R_RX_PAYLOAD];
  for (var i=0;i<this.PAYLOAD;i++) data.push(0);
  data = this.spi.send(data,this.CSN);
  data.splice(0,1);
  return data;
};


//Functions to implement later -------------------------------------

//RF24.prototype.whatHappened = function(){};

//RF24.prototype.failureDetected = function(){};

//RF24.prototype.testCarrier = function(){};

//RF24.prototype.testRPD = function(){};

//RF24.prototype.isValid = function(){};

//RF24.prototype.printDetails = function(){};

//RF24.print_byte_register = function(){};

//RF24.print_observe_tx = function(){};

//RF24.print_address_register = function(){};





// private -------------------------------------------
//
//
//
//
RF24.ce = function(level){
  digitalWrite(this.CE,level);
};

RF24.flush_rx = function(){
  return spiTrans(C.FLUSH_RX);
};
RF24.flush_tx = function(){
  return spiTrans(C.FLUSH_TX);
};

RF24.get_status = function() {
  return spiTrans(C.NOP);
};

RF24.toggle_features = function() {
 spiTrans([C.ACTIVATE,0x73]);

};

RF24.spiTrans = function(cmd){
    return this.spi.send(cmd, this.CSN);
};

RF24.delayMicro = function(delay){
  var timer = getTime();
  while(getTime() - timer > .001 * this.txRxDelay){}
};


//Create object for radio
exports.connect = function(_spi, _csn, _ce, _payload) {
  return new RF24(_spi, _csn, _ce, _payload);
};
