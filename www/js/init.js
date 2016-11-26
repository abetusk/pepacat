function downloadModel() {
  var blob = new Blob( [g_pepacat_model.ExportJSON()] , {type: "text/plain;charset=utf-8"});
  saveAs(blob, "model.json");
}

function loadFile_base64(e) {

  var data  = e.target.result;

  //console.log("got:", data);

  var idx = 0;
  var n = data.length;
  for (idx=0; idx<n; idx++) {
    if (data[idx]==',') { break; }
  }

  if (idx==n) {
    console.log("error reading file, no ',' found");
    return;
  }

  console.log(">>:", idx, n, data.slice(idx+1,n-idx-1));
  var str_data = atob(data.slice(idx+1,n-idx-1));


  console.log(">>:", str_data);

}


function file_ul() {
  var ele = document.getElementById("file_ul");

  console.log("ele", ele);

  var fns = ele.files;

  console.log("files", fns);

  console.log("file_ul >>>fn", fns[0]);

  var fn = fns[0];

  if (typeof fn === "undefined") {
    console.log("file error");
    return;
  }

  var reader = new FileReader();
  reader.onload = loadFile_base64;
  reader.readAsDataURL(fn);
}


