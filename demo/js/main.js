/*

TMX Bridge Appliance Demo
v.1

Requires the TMX Bridge Appliance
connected to a T-Max Manager with at least one T-Max 3A/3W for testing.

Get more info about the TMX Bridge Appliance
https://www.tmxbridge.com/

Get more info about T-Max on the Applied Digital website:
https://www.appdig.com/

*/

//SETUP DEMONSTRATION VALUES ************************
var TMX_BRIDGE = 'https://demo.tmxbridge.net/service/tmax/';
var STATE_TIMER_INTERVAL = 5000; //poll every X seconds

//You must setup this array with the real beds you have connected
var DEVICES_ENABLED = [30, 31, 32];

//END SETUP *************************************

var STATE_TIMER;
var DEVICE_PORT = '';

//init the app
$(function(){

	tmx._init();
});

//this is the main object
var tmx = {
	_init : function(){
		var self = this;

		//hide all sections
		$(".controlItem").hide();

		//add the working modal
		$("body").append('<div id="_working">Working</div>');

		//turn it on from the utility object
		util.working(true);

		//list the device ports
		self.listPorts();

		//list the connected beds
		self.listAddresses(function(){
			//bind up the click events
			self.bindEvents();
		});
	},
	bindEvents : function(){
		var self = this;

		//click event for running a bed
		$("#btnBedOn").off("click").on("click", function(){

			//get the values from the option input boxes
			var b = $("#deviceAddresses").val();
			var d = $("#deviceDelaytime").val();
			var r = $("#deviceRuntime").val();

			//test to see if the values are at least numeric
			//but you will want to run other tests on the values
			//to be sure you have valid parameters for the T-Max Manager
			if (!util.isNumeric(b)) {
				alert("Please choose a bed number between 1 and 128.");
				return false;
			}

			if (!util.isNumeric(r)) {
				alert("Please enter a valid run time between 1 and 20.");
				$("#deviceRuntime").val("5");
				return false;
			}

			if (!util.isNumeric(d)) {
				alert("Please enter a valid delay time between 0 and 5.");
				$("#deviceDelaytime").val("3");
				return false;
			}

			//turn on the device
			self.deviceOn(b, r, "1", d);
		});

		//this is a class button that allows you to shut down a session
		//turn off the bed and reset the T-Max Timer.
		//Like a kill switch... once you hit it, the session is gone.
		$(".bedOff").off("click").on("click", function(){
			var id = $(this).attr("data-id");
			self.deviceOff(id);
		});
	},
	deviceOff : function(b){
		var self = this;

		//get the required parameters per the documentation
		var parm = {
			"p" : DEVICE_PORT, //the port name
			"b" : b //e.g. bed 30
		}

		//set the endpoint
		var data_url = TMX_BRIDGE + "service/device/off/";

		//show the working modal
		util.working(true);

		//do the ajax call
		util.ajax(parm, data_url, function(data){

			//if successful, the returned status will equal "success"
		    if (data.status == "success") {

				//do a status update
				self.deviceStatus(true, function(){
					util.working(false);
				});

		    } else {

				//on error, you will receieve the msg
				util.working(false);
				alert(data.msg);
		    }
		});
	},
	deviceOn : function(b, r, s, d){
		var self = this;

		//get the required parameters per the documentation
		var parm = {
			"p" : DEVICE_PORT, //the port name
			"b" : b, //e.g. bed 30
			"r" : r, //e.g. run for 10 minutes
			"s" : s, //0=off 1=on 129=has facials
			"d" : d //e.g. 3 minute delay
		}

		//set the endpoint
		var data_url = TMX_BRIDGE + "service/device/on/";

		//show the working modal
		util.working(true);

		//do the ajax call
		util.ajax(parm, data_url, function(data){

			//if successful, the returned status will equal "success"
		    if (data.status == "success") {

				//do a status update
				self.deviceStatus(true, function(){});

		    } else {
				//on error, you will receieve the msg
				alert(data.msg);
		    }
		});
	},
	deviceStatus : function(bk, cb){
		var self = this;

		//get the required parameters per the documentation
		var parm = {
			"p" : DEVICE_PORT, //the port name
		}

		//set the endpoint
		var data_url = TMX_BRIDGE + "service/device/status/";

		//display the status indicator
		$("#statusUpdateNotification").addClass("thisStatusRunning");

		//we may want to show the working modal on some calls
		//this gives us the option to update status in the background
		if (bk == false) {
			util.working(true);
		}

		//do the ajax call
		util.ajax(parm, data_url, function(data){

			//remove all notifications of work
			util.working(false);
			$("#statusUpdateNotification").removeClass("thisStatusRunning");

			//if successful, the returned status will equal "success"
		    if (data.status == "success") {

				var thisDeviceStatus;
				var thisDeviceTime;
				var thisClass;
				var bedStatusClass = [];
					bedStatusClass["Ready"] = "statusReady";
					bedStatusClass["Delay"] = "statusDelay";
					bedStatusClass["Cool Down"] = "statusCooldown";
					bedStatusClass["Dirty Bed"] = "statusDirty";
					bedStatusClass["Device On, Lamps On"] = "statusRunning";
					bedStatusClass["Device On, Lamps Off"] = "statusRunningOff";

				//loop through the devices we have connected and just get the status
				//for only those. In this case, we are keeping track of those with a static
				//global array.
				for (var i = 0; i < DEVICES_ENABLED.length; i++) {

					//get the device status
					thisDeviceStatus = data.device_status["Device " + DEVICES_ENABLED[i]];

					//get the device time if applicable
					thisDeviceTime = data.device_time["Device " + DEVICES_ENABLED[i]];

					//apply the class for the bed object
					thisClass = bedStatusClass[thisDeviceStatus];

					//apply the status class after resetting all possible classes
					$("#bed" + DEVICES_ENABLED[i])
						.removeClass("statusReady")
						.removeClass("statusDelay")
						.removeClass("statusCooldown")
						.removeClass("statusDirty")
						.removeClass("statusRunning")
						.removeClass("statusRunningOff")
						.addClass(thisClass);

					//grammer adjustment
					if (thisDeviceTime == 1) {
						thisDeviceTime = "1 Minute";
					} else if (thisDeviceTime == null) {
						//we may get NULL as an initial value
						thisDeviceTime = "";
					} else {
						thisDeviceTime = thisDeviceTime + " Minutes";
					}

					//time is only applicable for certain states
					if (thisClass == "statusDelay" || thisClass == "statusCooldown" || thisClass == "statusRunning" || thisClass == "statusRunningOff" ) {

						//let's replace one of the states with something we like better
						if (thisClass == "statusRunning") {
							thisDeviceStatus = "Bed Running";
						}

						//update the status string for this bed
						thisDeviceStatus = thisDeviceStatus + " " + thisDeviceTime;
					}

					//have the bed report it's state
					$("#bedStatus" + DEVICES_ENABLED[i]).text(thisDeviceStatus);
				}

				cb();

		    } else {

				//some type of error has occurred... stop the timer and report the error
				clearInterval(STATE_TIMER);
				STATE_TIMER = 0;
				alert(data.msg);
				cb();
		    }
		});
	},
	listAddresses : function(cb){
		var self = this;

		//loop through all 128 possible addresses but only load the devices listed in
		//our "enabled" device array
		for (var i = 1; i < 129; i++) {

			//create the device address options
			if (self.listEnabledDevices(i) == true) {

				//create the item and add it to the "run" list
				$("#deviceAddresses").append('<option value="' + i + '">' + i + '</option>');

				//create the bed object
				var ele = '<div id="bed' + i + '" class="enabledBed" data-id="' + i + '"> Bed ' + i + ' - <span id="bedStatus' + i + '">Getting status...</span> <div class="bedOff" data-id="' + i + '">Stop Session</div></div>';

				//add it to the list
				$("#deviceBedList").append(ele);
			}
		}
		cb();
	},
	listEnabledDevices : function(device){
		var self = this;
		var match = false;

		//loop through our enabled devices array and see if this device is listed
		for (var i = 0; i < DEVICES_ENABLED.length; i++) {
			if (device == DEVICES_ENABLED[i]) {
				match = true;
			}
		}
		return match;
	},
	listPorts : function(){
		var self = this;

		//set the endpoint
		var data_url = TMX_BRIDGE + "service/ports/";

		//show the working modal
		util.working(true);

		//show the ports html section
		$("#devicePorts").show();

		//do the ajax call
		util.ajax('', data_url, function(data){

			//hide the working modal
		    util.working(false);

			//if successful, the returned status will equal "success"
		    if (data.status == "success") {

				//get a count of the returned USB ports listed on the TMX Bridge
				var portCount = Object.keys(data.results).length;

				//no ports?
				if ( portCount == 0) {
					$("#availablePortsList").html("<p>No USB ports found");
					return false;
				}

				//reset the list
				$("#availablePortsList").html("");

				//get the ports and add each to the list
				$.each(data.results, function(k,v){

					ele = '<div class="device-port form-check" data-port="' + v + '"> <input class="form-check-input" type="radio" name="devicePorts" id="' + k + '" value="' + v + '"> <label class="form-check-label" for="' + k + '">' + v + '</label> </div>';
					$("#availablePortsList").append(ele);
				});

				//bind up the click event
				$(".device-port").off("click").on("click", function(e){
					e.stopPropagation();

					//set the global port variable. Your production code will want to regularly check this value
					//for validity and offer handling for things like end users unplugging the USB cable or turning
					//off the TMX or even the T-Max Manager. Users do that stuff... lol
					//TMX will gracefully reconnect the USB but it will be up to your code to find out what location.
					//TMX enumerates the ports and depending on the length of the disconnect or number of times it was disconnted
					//it *may* reconnect to another address (e.g. ttyUSB1 instead of ttyUSB0)
					DEVICE_PORT = $(this).attr("data-port");

					//run device status running in the foreground with working modal
					//this give the user something to look at while we setup the UI
					self.deviceStatus(false, function(){
						$("#deviceBed").show();
						$("#deviceBedStatus").show();
						//start the timer that polls device state
						self.startStateTimer();
					});
				});

		    } else {

				alert(data.msg);
		    }
		});
	},
	startStateTimer : function(){
		var self = this;

		//create the device state timer that polls for state changes
		STATE_TIMER = setInterval(function(){
			self.deviceStatus(true, function(){
				//console.log("Updated device status");
			});
		}, STATE_TIMER_INTERVAL);
	}
}

//this is the utility object
//it provides helper abilities that aren't
//TMX related
var util = {
	ajax : function(data, url, success){
		var self = this;

		$.ajax({
		    type: "GET",
		    url: url,
		    data: data,
		    dataType: "json",
		    timeout: function(){
				alert("Timeout");
		    },
		    success: function(data){
		       success(data);
		    }
		})
	},
	isNumeric : function(n){
		var self = this;
		return !isNaN(parseFloat(n)) && isFinite(n);
	},
	working : function(toggle){
		var self = this;

		if (toggle == true) {
			$("#_working").show();
		} else {
			$("#_working").hide();
		}
	}
}
