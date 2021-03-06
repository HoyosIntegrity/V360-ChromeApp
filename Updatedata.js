
var greeting1 = document.querySelector('#greeting1');
var reverseTetheringButton = document.getElementById("reverseTethering");
var usb_mode_value_dropdown = document.getElementById("usb_mode_value");
var refresh_bluetooth_info_button = document.getElementById('bluetoothRefreshInfo');
var wifi_mode_Button = document.getElementById("wifi_mode_button");
var wifi_mode_value = document.getElementById("wifi_mode_value");

var bluetoothDaugtherBoardDevice;
const decoder = new TextDecoder('UTF-8');
function log(msg)
{
	var node = document.createElement("li");                 // Create a <li> node
	var textnode = document.createTextNode(msg);         // Create a text node
	node.appendChild(textnode);                              // Append the text to <li>
	greeting1.appendChild(node); 
}
function dataViewToArray(data)
{
	// Convert raw data bytes to hex values just for the sake of showing something.
	// In the "real" world, you'd use data.getUint8, data.getUint16 or even
	// TextDecoder to process raw data bytes.
	
	let a = [];
	for (let i = 0; i < data.byteLength; i++) 
	{
		a.push('0x' + ('00' + data.getUint8(i).toString(16)).slice(-2));
	}
	return a;
}
function handleNotifications(event)
{	
	let value = event.target.value;
	let a = dataViewToArray(value);
	log("Characteritic notification:"+event.target.uuid +" value: "+a.join(' '));
	if(event.target.uuid == '0000ffb4-0000-1000-8000-00805f9b34fb')
	{
		var resp = value.getUint8(0);
		switch(resp)
		{
			case 0x0:
				log("logged into the camera");
				camera_connection.RetrieveData();
				break;
			case 0x1:
				log("login denied try different pin or reset");
				break;
			case 0x2:
				log("home user already logged in");
				break;
		}
	}
}
function resetButtons()
{
	wifi_mode_Button.disabled = true;
	refresh_bluetooth_info_button.disabled = true;
	reverseTetheringButton.disabled = true;
}
var SCAM1_service_uuid = 0xff00;
var SCAM2_service_uuid = 0xff70;
var SCAM_2_WIFIINF_uuid = '0000ff79-0000-1000-8000-00805f9b34fb';
function onDisconnected(event)
{
	// Object event.target is Bluetooth Device getting disconnected.
	log(' Bluetooth Device disconnected');
	resetButtons();
}
async function displayDeviceInformation(server)
{
	const service = await server.getPrimaryService('device_information');
	characteristic = await service.getCharacteristic(BluetoothUUID.getCharacteristic('model_number_string'));
	await characteristic.readValue().then(value => {
		log(' Model Number String: ' + decoder.decode(value));
	});
	characteristic = await service.getCharacteristic(BluetoothUUID.getCharacteristic('hardware_revision_string'));
	await characteristic.readValue().then(value => {
		log(' Hardware Revision String: ' + decoder.decode(value));
	});
	characteristic = await service.getCharacteristic(BluetoothUUID.getCharacteristic('firmware_revision_string'));
	await characteristic.readValue().then(value => {
		log(' Firmware Revision String: ' + decoder.decode(value));
	});
	characteristic = await service.getCharacteristic(BluetoothUUID.getCharacteristic('software_revision_string'));
	await characteristic.readValue().then(value => {
		log(' Software Revision String: ' + decoder.decode(value));
	});
}
async function getFF70_Service(server)
{
	try{
		return await server.getService('f000ff70-0123-4000-b000-000000000000');
	}catch (e){
		log("Cannot find 0xFF70 service: "+e);
	}
}
async function getFF00_Service(server)
{
	try{
		return await server.getPrimaryService(0xff00);
	}catch (e){
		log("Cannot find 0xFF00 service: "+e);
	}
}
async function loginDaugtherBoard(service,pin)
{
	let user_pin = Uint8Array.of(0x30,0x30,0x30,0x30,0x00,0,0,0,0,0,0,0);
	await login(service,pin,'f000ffa2-0123-4000-b000-000000000000','f000ffa1-0123-4000-b000-000000000000',user_pin);
}
async function loginApq(service,pin)
{
	let user_pin = Uint8Array.of(0x0,0x30,0x30,0x30,0x30,0,0,0,0,0,0,0,0);
	
	await login(service,pin,0xffb4,0xffb3,user_pin);
}
async function login(service,pin,pin_notify_char,pin_char,user_pin)
{
	var pin_verify_characteristic = await service.getCharacteristic(pin_notify_char);
	var pin_characteristic = await service.getCharacteristic(pin_char);
	//subscribe for notify of pin result
	await pin_verify_characteristic.startNotifications()
	.then(characteristic => {
		characteristic.addEventListener('characteristicvaluechanged',handleNotifications);
		log('Notifications have been started.');
	  })
	//send pin	
	//first byte is login if 0x0
	//12 are password
	await pin_characteristic.writeValue(user_pin).then(_ =>{
		log("wrote camera PIN");
	});

}

async function getData(service,title,chare,print)
{
	let wifi_config_char = await service.getCharacteristic(chare);
	return await wifi_config_char.readValue()
	.then(value => 
	{
		if(print)
		{
			log(title+":"+ dataViewToArray(value));
		}
		return value;
	});
}
async function writeData(service,title,chare,data)
{
	let wifi_config_char = await service.getCharacteristic(chare);
	return await wifi_config_char.writeValue(data)
	.then(_ => 
	{
		log("wrote "+title+":"+data );
	});
}
class CameraInfo
{
	constructor(apq,db)
	{
		this.apq_services = apq;
		this.db_service = db;
	}
	async login()
	{
		log('Logging in to Camera');
		await loginApq(db_service,"0000");
	}
	async RetrieveCameraIpAddress()
	{
		let wifi_info_data = await getData(this.apq_services,"current wifi info",0xff42,false);
		let wifi_info = createCurrentWifiInformationStruct(wifi_info_data);
		document.getElementById("webaddress").value = wifi_info["ipaddress"];
		logData("current wifi info",wifi_info);
	}
	async RetrieveData()
	{
		log('Getting Camera services');
		reverseTetheringButton.disabled = false;
		bluetoothRefreshInfo.disabled = false;
		wifi_mode_Button.disabled = false;
		try{
			var read_usb_mode = await getData(this.apq_services,"usb mode",0xff0b,false);
			usb_mode_value_dropdown.value = read_usb_mode.getUint8(0);
		}catch(e)
		{
			log("cannot read usb mode:"+ e);
		}
		//
		await getData(this.db_service,"camera capture mode",0xff80,true);
		
		let camera_info_data = await getData(this.apq_services,"camera information",0xff43,false);
		let camera_info = createCameraInformationStruct(camera_info_data);
		logData("Camera information",camera_info);

		let camera_name = await getData(this.apq_services,"camera name",0xff06,false);
		log("Camera Name: "+decoder.decode(camera_name));
		
		await this.RetrieveCameraIpAddress();
		
		let wifi_config_data = await getData(this.apq_services,"wifi config",0xff30,false);
		let wifi_config = createCurrentWifiConfigurationStruct(wifi_config_data);
		wifi_mode_value.value = wifi_config;
		
		//logData("wifi config",wifi_config);
		//show wifi settings on a text field on the right side including dropdown to save them.
		let ap_config_data = await getData(this.apq_services,"access point config",0xff31,false);
		let ap_config = createApConfigurationStruct(ap_config_data);
		logData("access point config",ap_config);
	}
	async usb_tethering(value)
	{
		await writeData(this.apq_services,"usb mode",0xff0b,Uint8Array.of(value));
	}
	async wifi_config(value)
	{
		await writeData(this.apq_services,"wifi mode",0xff30,Uint8Array.of(value));
	}
}
refresh_bluetooth_info_button.onclick = async function()
{
	refresh_bluetooth_info_button.disabled =true;
	await camera_connection.RetrieveCameraIpAddress();
	refresh_bluetooth_info_button.disabled =false;
}
reverseTetheringButton.onclick = async function()
{
	var value = usb_mode_value_dropdown.options[usb_mode_value_dropdown.selectedIndex].value
	reverseTetheringButton.disabled = true;
	await camera_connection.usb_tethering(parseInt(value));
	reverseTetheringButton.disabled = false;
};
wifi_mode_Button.onclick = async function()
{
	var value = wifi_mode_value.options[wifi_mode_value.selectedIndex].value
	wifi_mode_Button.disabled = true;
	await camera_connection.wifi_config(parseInt(value));
	wifi_mode_Button.disabled = false;
}
var camera_connection = null;

document.getElementById("bluetoothCameraStartScan").onclick = async function()
{
	//try{
		bluetoothCameraStartScan = await navigator.bluetooth.requestDevice({
				filters: [{
					services: [
								SCAM1_service_uuid,
								SCAM2_service_uuid
							]
				}],
				
				optionalServices: [
					SCAM2_service_uuid,
					'f000ff70-0123-4000-b000-000000000000',
					'f000ff00-0123-4000-b000-000000000000',
					'device_information',
					0xffe0,	
					0x1800,
					0xfd51
				]
			});
			bluetoothCameraStartScan.addEventListener('gattserverdisconnected', onDisconnected);
			log("found a Camera device:"+JSON.stringify(bluetoothCameraStartScan));
			const server = await bluetoothCameraStartScan.gatt.connect();
			
			db_service = await server.getPrimaryService(0xff70);
			var db_chars = await db_service.getCharacteristics();
			
			let apq_services = await getFF00_Service(server);
			var apq_chars = apq_services.getCharacteristics();
			
			if(!db_service || !apq_services)
			{
				return;
			}
			camera_connection = new CameraInfo(apq_services,db_service)
			await camera_connection.login();
	//}catch(e)
	{
		//log(e);
	}
};
function logData(title,data)
{
	log(title+":"+JSON.stringify(data,null,2));
}
function createApConfigurationStruct(dataview)
{
	let buffer = dataview.buffer;
	let tmp = {
		"camera-ap-ssid":decoder.decode(buffer.slice(0,31)),
		"security-type":dataview.getUint8(32),
		"channel": dataview.getUint8(33)
	};
	return tmp;
}
function createCurrentWifiConfigurationStruct(dataview)
{
	return dataview.getUint8(0);
	/*let buffer = dataview.buffer;
	let type_str = "";
	switch(dataview.getUint8(0))
	{
		case 0x0:
		type_str = "no wifi";
		break;
		case 0x1:
		type_str = "wifi ap";
		
		break;
		case 0x2:
		type_str = "wifi station";
	
		break;
	}
	let tmp = {
		"wifi-connection-type":type_str
	};
*/
	return tmp;
}
function createCurrentWifiInformationStruct(dataview)
{
	let buffer = dataview.buffer;
	let tmp = {
		"wifi-connection-type":dataview.getUint8(0),
		"wifi-ssid":decoder.decode(buffer.slice(1,32)),
		"ipaddress": dataview.getUint8(33)
		+"."+dataview.getUint8(34)
		+"."+dataview.getUint8(35)
		+"."+dataview.getUint8(36)
	};
	return tmp;
}
function createCameraInformationStruct(dataview)
{
	let buffer = dataview.buffer;
	let tmp = {
		"fw":decoder.decode(buffer.slice(0,23)),
		"serial": decoder.decode(buffer.slice(24,34)),
		"camera": decoder.decode(buffer.slice(35,46))
	};
	return tmp;
}
document.getElementById("bluetoothStartScan").onclick = async function()
{	
	//try
	{
		bluetoothDaugtherBoardDevice = await navigator.bluetooth.requestDevice({
			filters: [{
				services: [SCAM2_service_uuid]
			}],
			
			optionalServices: [
				SCAM2_service_uuid,
				'device_information',
				'f000ff70-0123-4000-b000-000000000000',
				0xffe0,
				0x1800,
				0xfd51
			]
		
		});
		bluetoothDaugtherBoardDevice.addEventListener('gattserverdisconnected', onDisconnected);
		log("found a DaugtherBoard:"+bluetoothDaugtherBoardDevice);
		const server = await bluetoothDaugtherBoardDevice.gatt.connect();
		log('Getting daugtherboard services ');
		try{
			await displayDeviceInformation(server);
		}
		catch(e)
		{
			log("exception getting device information:" + e);
		}

		const db_service = await server.getPrimaryService('f000ff70-0123-4000-b000-000000000000');
		if(!db_service)
		{
			return;
		}
		const db_characteristics = await db_service.getCharacteristics();
		await loginDaugtherBoard(db_service,"0000");
		
		//this is notification only and only on the APQ??
		/*
		var WFIINFO_char = await db_service.getCharacteristic(SCAM_2_WIFIINF_uuid);	
			WFIINFO_char.addEventListener('characteristicvaluechanged:',handleNotifications);	
			await WFIINFO_char.startNotifications();
	
	
		*/
		
		//before powering on the ios app saves the APQ serial number for comparision

		//power on
		let power_data = Uint8Array.of(0,1);
		var APPBUT_characteristic = await db_service.getCharacteristic('f000ff89-0123-4000-b000-000000000000');
		await APPBUT_characteristic.writeValue(power_data);
		
		log("Camera Main Processor should now be turning on. Go to Step 2 ");
		log("Camera will display a solid GREEN LED")
		log("Disconnecting from Camera DaugtherBoard (this is normal after turning on the camera.) ");
		
	}
	//catch(er)
	{
	//	log(er);
	}	
};

