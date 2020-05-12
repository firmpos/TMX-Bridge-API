#TMX Bridge Appliance API
The TMX Bridge API is a series of appliance endpoints that allow you to control T-Max connected devices using a T-Max Manager Pro or the T-Max Manager G2. At the moment, it runs on the Raspberry Pi 3 B hardware. You should be able to burn the image to a micro SD, configure the network and go.

##Network Setup
The first part of setup is locating the device on your network. Be careful as you make changes because you can quickly create a mess of work for yourself if you make an error here and get locked out or brick the device. This will require some basic knowledge of Linux.

##SSH

	user: pi
	pwd: tmx

	e.g. ssh pi@192.168.x.x)

Change the IP address:

	sudo nano /etc/network/interfaces

Here is what you should see:

	# The loopback network interface
	auto lo
	iface lo inet loopback

	# The primary network interface
	auto eth0
	iface eth0 inet dhcp
	#iface eth0 inet static
	#        address 192.168.1.167
	#        netmask 255.255.255.0
	#        gateway 192.168.1.1
	#       dns-nameservers 1.1.1.1 8.8.8.8

Comment the dhcp entry and uncomment the static entry, adding the IP address, netmask, gateway and dns-nameservers:

	# The loopback network interface
	auto lo
	iface lo inet loopback

	# The primary network interface
	auto eth0
	#iface eth0 inet dhcp
	iface eth0 inet static
	        address 192.168.1.167
	        netmask 255.255.255.0
	        gateway 192.168.1.1
	       dns-nameservers 1.1.1.1 8.8.8.8

####Returns:
    Should reboot on success.

###Local DNS and SSL
Modern browsers will complain if you try to connect to a local IP address over http. The TMX Bridge Appliance includes an SSL certificate pre-installed on Apache for the tmxbridge.net domain.

Getting it working on your network is easy.

Once you set the IP address on the device, add an entry in your local DNS or hosts file. Point the device's IP address to subdomain.tmxbridge.net (where the word 'subdomain' is anything you choose) then open your web browser and try: https://subdomain.tmxbridge.net

Let's say you named the device 'demo.tmxbridge.net' in your local DNS. From your cloud based app, you can use jQuery Ajax calls to query the TMX endpoints. We've handled the SSL and cross-origin issues for you.

####Code Example:

    $.ajax({
        type: "GET",
        url: 'https://demo.tmxbridge.net/service/ports/',
        data: '',
        dataType: "json",
        success: function(data){
            //should return ports in JSON format
            //{"status":"success","results":{"port0":"\/dev\/ttyUSB0"}}
        }
    });

##Coding Endpoints
These endpoints allow you to make connections, send commands and query devices. All code examples provided are in jQuery.

###Endpoint: /service/ports/

This allows to discover the USB-Serial ports on the appliance. Your code can poll this endpoint to detect if the T-Max connection changes.

####Parms: GET
    None Required

####Returns:
    status
    results

####Code Example:

    $.ajax({
        type: "GET",
        url: 'service/ports/',
        data: '',
        dataType: "json",
        success: function(data){
            //should return ports in JSON format
            //{"status":"success","results":{"port0":"\/dev\/ttyUSB0"}}
        }
    })

###Endpoint: /service/device/on/

This allows you to turn a T-Max device on. It supports beds with and without facial tanners.

####Parms: GET
    Required:
        p //this is the port name (e.g. /dev/ttyUSB0)
        b //this is the bed number
        r //this is the run time

    Optional:
        s //start bulbs option. 0=off, 1=on (default), 129=facials on
        d //delay countdown time before the bed turns on

####Returns:
    status

####Code Example:

    var parm = {
        "p" : "/dev/ttyUSB0", //the port name
        "b" : "30", //bed 30
        "r" : "10", //run for 10 minutes
        "s" : "129", //has facials
        "d" : "3" //3 minute delay
    }

    $.ajax({
        type: "GET",
        url: 'service/device/on/',
        data: parm,
        dataType: "json",
        success: function(data){
            //should return JSON
            //{"status":"success"}
        }
    })

###Endpoint: /service/device/off/

This allows you to turn a T-Max device off.

####Parms: GET
    Required:
        p //this is the port name (e.g. /dev/ttyUSB0)
        b //this is the bed number

####Returns:
    status

####Code Example:

    var parm = {
        "p" : "/dev/ttyUSB0", //the port name
        "b" : "30", //bed 30
    }

    $.ajax({
        type: "GET",
        url: 'service/device/off/',
        data: parm,
        dataType: "json",
        success: function(data){
            //should return JSON
            //{"status":"success"}
        }
    })

###Endpoint: /service/device/status/

This allows you to see the status of all connected devices. It should return 2 arrays of data: "device_status" and "device_time".

####device_time

The device_time array shows remaining time for each device no matter what status mode it is currently in. For instance, if a bed is in "cool down" mode, this time will indicate how long until the bed is ready to use again.

####device_status

The device_status array lists status for 128 connected devices. NOTE: You will see "Ready" for all connected beds that are ready to use AND for all empty device addresses. You should keep a local array of connected devices for cross reference.

    These are all possible status messages:  

    array(
        0 => "Ready",
        1 => "Delay",
        2 => "Device On, Lamps Off",
        3 => "Device On, Lamps On",
        4 => "Dirty Bed",
        5 => "Cool Down",
        91 => "EEProm Data Error",
        92 => "Current Sense Error - Current OFF",
        93 => "Current Sense Error - Current ON",
        94 => "Max Time Error"
    )

####Parms: GET
    Required:
        p //this is the port name (e.g. /dev/ttyUSB0)

####Returns:
    status
    device_time
    device_status

####Code Example:

    var parm = {
        "p" : "/dev/ttyUSB0", //the port name
    }

    $.ajax({
        type: "GET",
        url: 'service/device/status/',
        data: parm,
        dataType: "json",
        success: function(data){
            //should return JSON
            {
                "status":"success",
                "device_status":
                {
                    "Device 1":"Delay",
                    "Device 2":"Device On, Lamps On",
                    "Device 3":"Dirty",
                    "Device 4":"Cool Down" //128 total values
                },
                "device_time":
                {
                    "Device 1":"3",
                    "Device 2":"14",
                    "Device 3":"0",
                    "Device 4":"2" //128 total values
                }
            }
        }
    })

###Endpoint: /service/device/parm/

This allows you to select a specific T-Max parameter to monitor. Use the "q" parameter to specify which data to view. Then you can list the data using the /service/device/parms/ endpoint.

    0   Tan time before start sent
    1   Device Address
    2   Beep Mode Option
    3   Session Delay Time Option
    4   Current Sense Option
    5   Session Count
    6   Lamp Hours
    7   Bed Hours
    8   Manual Session
    9   Clean Room Option
    10  Manual Lockout Option
    13  Cool Down Minutes Option

####Parms: GET
    Required:
        p //this is the port name (e.g. /dev/ttyUSB0)
        q //this is the query parameter

####Returns:
    status

####Code Example:

    var parm = {
        "p" : "/dev/ttyUSB0", //the port name
        "q" : "6", //the parm number for total bed hours
    }

    $.ajax({
        type: "GET",
        url: 'service/device/parm/',
        data: parm,
        dataType: "json",
        success: function(data){
            //should return JSON
            //{"status":"success"}
        }
    })

###Endpoint: /service/device/parms/

Once you specify the parameter you want to retrieve using the /service/device/parm/ endpoint, you can query this to get an array of values for each device. For instance, if you want to track the lamp hours for each bed.

####Parms: GET
    Required:
        p //this is the port name (e.g. /dev/ttyUSB0)

####Returns:
    status
    device_status

####Code Example:

    var parm = {
        "p" : "/dev/ttyUSB0", //the port name
    }

    $.ajax({
        type: "GET",
        url: 'service/device/parms/',
        data: parm,
        dataType: "json",
        success: function(data){
            //should return JSON
            {
                "status":"success",
                "device_status":
                {
                    "Device 1 LSB":"80",
                    "Device 1 MSB":"1",
                    "Device 2 LSB":"45",
                    "Device 2 MSB":"1",
                    "Device 3 LSB":"30",
                    "Device 3 MSB":"1" //128 total values
                }
            }
        }
    })

###Endpoint: /service/device/rescan/

This instructs the connected T-Max Manager to rescan the devices.

####Parms: GET
    Required:
        p //this is the port name (e.g. /dev/ttyUSB0)

####Returns:
    status

####Code Example:

    var parm = {
        "p" : "/dev/ttyUSB0", //the port name
    }

    $.ajax({
        type: "GET",
        url: 'service/device/rescan/',
        data: parm,
        dataType: "json",
        success: function(data){
            //should return JSON
            //{"status":"success"}
        }
    })

TMX Bridge Appliance API V.1
2020 Ash Capital Ltd.
tmxbridge.com
