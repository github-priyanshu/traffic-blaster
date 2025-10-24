var loadedNumberData = false;
if (!loadedNumberData) {
    var loadedNumber = Number(localStorage.getItem('loadedNumber')) || 0;
    localStorage.setItem("loadedNumber", ++loadedNumber);
    loadedNumberData = loadedNumber;
}
function getFingerPrint(){
    return loadedNumberData+":-:"+getDefaultName();
}

function getDefaultName(name){
  var dv=navigator.appVersion.split(")")[0].replace("5.0 (","").replace("Linux; Android","An..");
  return dv;
}