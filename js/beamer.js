$( document ).ready(function() {
	$('.advanced').hide();
	
});
var hasTriangles = false;
$('#hole-diameter').on('change', function(){
         $('#beam-width').attr('data-parsley-min', $('#hole-diameter').val() * 3);
});

$('#bit-diameter').on('change', function(){
         var bitDiameter = $('#bit-diameter').val();
         $('#hole-diameter').attr('data-parsley-max', bitDiameter);
         });


$('#check-triangle').on('click', function (){
	if ($('#check-triangle').prop('checked')) {
          $('#change-image').attr("src","images/triangles.png");
         }
       else
         {
           $('#change-image').attr("src","images/straight.png");
         }
});


$('.exit-modal').on('click', function (){
	$('.modal, .modal-container').fadeOut('fast');
});


$('.basic-link').on('click', function (){
	$('.basic').show();
	$('.advanced').hide();
	$('.lock').hide();
	$('.unlock').hide();
	$('.advanced').attr("disabled", "true");
	$('.advanced + ul').hide();
	$('.basic + ul').show();
});
$('.advanced-link').on('click', function (){
	$('.basic').hide();
	$('.advanced').show();
	$('.lock').show();
	$('.unlock').hide();
	$('.advanced').attr("disabled", "true");
	$('.parsley-required').hide();
	$('.advanced + ul').show();
	$('.basic + ul').hide();
});

$('.lock').on('click', function (){
	$('.lock').hide();
	$('.unlock').show();
	$('.advanced').removeAttr('disabled');
});

$('.unlock').on('click', function (){
	$('.lock').show();
	$('.unlock').hide();
	$('.advanced').attr("disabled", "true");
});


$('#submit').on('click', function (){
	$('.basic-setting').parsley().on('form:submit', function() {
	      
 // start creating file 
		if ($('#check-triangle').prop('checked')) {
		  hasTriangles = true;
         }
		else
         {
		  hasTriangles = false; 
         }
		 //values from form
		var holeDiameter = parseFloat($('#hole-diameter').val());
		var beamWidth = parseFloat($('#beam-width').val());
		var holeSpacing = parseFloat($('#hole-spacing').val());
		var speed = parseFloat($('#feed-rate').val());
		var bitDiameter = parseFloat($('#bit-diameter').val());
		var thickness = Math.abs(parseFloat($('#thickness').val()));
		var thruCut = Math.abs(parseFloat($('#thru-cut').val()));
		var cutDepth = 0 - (thickness + thruCut);	
		var safeZ = parseFloat($('#safe-Z').val());

		//calculated values
		
		var beamRadius = beamWidth / 2;
		var startY = beamRadius;
		var startX = beamRadius;
		if (hasTriangles){
			// triangle vals
			var flipX = -1; // used to flip the X-axis orientation of pairs of triangle cutouts
			var moveY = 0;  // a counter to offset pairs of cutouts in Y
			var centerY = ((holeSpacing / 2) + startY); // Find the center of the beam to place the first triangle
			var triangleSideLength = ((beamWidth * 0.6)  - (bitDiameter /2));	//size triangle to beam width	
			var triangleXOffset = ((triangleSideLength * Math.cos(.5235988))  / 2);
			var triangleYOffset = (triangleSideLength + bitDiameter);
				var shopbotCode = [ 		
// cut first triangle in center of beam
					"'Bit Diameter: " + bitDiameter ,
					//"VC, " + bitDiameter,
					"'Safe Z",
					"MZ, " + safeZ,
					"'Spindle On",
					"SO, 1,1",
					"MS," + speed,
					"pause 3",			
					"M2, " + (startX + triangleXOffset).toFixed(2) + "," + centerY ,
					"MZ, " + cutDepth,
					"M2, " + (startX + (flipX * triangleXOffset)).toFixed(2) + ", " +  (centerY  + (triangleSideLength / 2)).toFixed(2), 
					"MY, " + (centerY  - ( triangleSideLength / 2)).toFixed(2),
					"M2, " + (startX + triangleXOffset).toFixed(2) + ", " +  centerY, 
					"MZ, " + safeZ
							];			
// continue cutting pairs of triangles
			var nextPair = (moveY + triangleYOffset);
			var lastPair = ((holeSpacing / 2) -  triangleYOffset);
			while ( nextPair < lastPair) {	
				shopbotCode.push(
					
					//"MZ, " + safeZ,
					"M2, " + (startX + (flipX * triangleXOffset)).toFixed(2) + ", " +  (centerY + nextPair).toFixed(2),
					"MZ, " + cutDepth,
					"M2, " + (startX + (flipX * (0 - triangleXOffset))).toFixed(2) + ", " +  ((centerY + nextPair) + (triangleSideLength / 2)).toFixed(2),			
					"MY, " + ((centerY + nextPair) - ( triangleSideLength / 2)).toFixed(2), 			
					"M2, " + (startX + (flipX * triangleXOffset)).toFixed(2) + ", " +  (centerY  + nextPair).toFixed(2), 			
					"MZ, " + safeZ,
					"M2, " + (startX + (flipX * triangleXOffset)) .toFixed(2)+ ", " +  (centerY  - nextPair).toFixed(2),
					"MZ, " + cutDepth,
					"M2, " + (startX + (flipX * (0 - triangleXOffset))).toFixed(2) + ", " +  ((centerY  - nextPair) + (triangleSideLength / 2)).toFixed(2),	
					"MY, " + ((centerY - nextPair) - ( triangleSideLength / 2)).toFixed(2),
					"M2, " + (startX + (flipX * triangleXOffset)).toFixed(2) + ", " +  (centerY  - nextPair).toFixed(2),
					"MZ, " + safeZ				
				)
				flipX = flipX * -1;	
                nextPair = nextPair + triangleYOffset;				
			} 			

// cutout beam
            shopbotCode.push(
			//"MZ, " + safeZ,			
			"CP, " + (holeDiameter - bitDiameter) + ", " + startX + ", " + startY + ",T,,,," + cutDepth + ",,,,4,,1",
			"MZ, " + safeZ,
			"CP, " + (holeDiameter - bitDiameter) + ", " + startX  + ", " + (startY  + holeSpacing).toFixed(2) + ",T,,,," + cutDepth + ",,,,4,,1",
			"MZ, " + safeZ,
			"CP, " + (beamWidth + bitDiameter) + ", " + startX + ", " + startY + ",T,-1,270,90," + cutDepth + ",,,,,1,1",
			"CP, " + (beamWidth + bitDiameter) + ", " + startX + ", " + (startY + holeSpacing).toFixed(2) + ",T,-1,90,270,,,,,,1,",
			"MY, " + startY,
			"MZ, " + safeZ
			)
		}
		else
		{
// no triangles
		var shopbotCode = [ 
			"'Bit Diameter: " + bitDiameter,
			//"VC, " + bitDiameter,
			"'Safe Z",
			"MZ," + safeZ,
			"'Spindle On",
			"SO,1,1",
			"MS," + speed,
			"pause 3",
			
			"CP, " + (holeDiameter - bitDiameter) + ", " + startX + ", " + startY + ",T,,,," + cutDepth + ",,,,4,,1",
			"MZ, " + safeZ,
			"CP, " + (holeDiameter - bitDiameter) + ", " + startX  + ", " + (startY  + holeSpacing).toFixed(2) + ",T,,,," + cutDepth + ",,,,4,,1",
			"MZ, " + safeZ,
			"CP, " + (beamWidth + bitDiameter) + ", " + startX + ", " + startY + ",T,-1,270,90," + cutDepth + ",,,,,1,1",
			"CP, " + (beamWidth + bitDiameter) + ", " + startX + ", " + (startY + holeSpacing).toFixed(2) + ",T,-1,90,270,,,,,,1,",
			"MY, " + startY ,
			"MZ, " + safeZ 
		];
       }
		var beamerCode = shopbotCode.join('\n');

		 fabmoDashboard.submitJob(beamerCode, {filename : 'beamer.sbp',
                                	name : 'Beamer',
                                    description : 'Cut a beam with ' + holeDiameter + '" diameter holes that are ' + holeSpacing + '" apart' 
		 });});
		
	  }
);

