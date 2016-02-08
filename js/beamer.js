var hasTriangles = false;

// Object to store the App configuration that we'll read from fabmo
var appConfig = {};

$( document ).ready(function() {

    // Get the machine configuration (global for the tool)
    fabmo.getConfig(function(err, data) {
      if(err) {
        console.log(err);
      } else {
          var xMax = data.machine.envelope.xmax.toString();
          var yMax = data.machine.envelope.ymax.toString();
          $('#beam-width').attr('data-parsley-max', xMax);
          $('#hole-spacing').attr('data-parsley-max', yMax);
      }
    });

    // Get the App configuration (specific to this app)
    fabmo.getAppConfig(function(err, data) {
        appConfig = data;
        for(key in appConfig) {
            console.info('Key "' + key + '" found in the app config with a value of ' + data[key]);
            $('#' + key).val(appConfig[key])
        }

        // For Bill:
        appConfig.timesAppWasLoaded = appConfig.timesAppWasLoaded ||  0;
        appConfig.timesAppWasLoaded++;
        console.log("loaded")
        fabmo.notify('info', 'App has been loaded ' + appConfig.timesAppWasLoaded + ' times.');
        fabmo.setAppConfig(appConfig);
    });
}); // document.ready

$('#beam-Length').text('The overall length of your beam will be ' + ( parseFloat($('#hole-spacing').val()) + parseFloat(($('#beam-width').val()))))


$('form').parsley().on('field:success', function() {
    // This event will fire whenever a field successfully validates.
    // 'this' will be a ParsleyField instance

    var el = this.$element;             // Get the jquery element from the ParsleyField instance
    var id = el.attr('id');             // Get the id from the jquery element
    
    // Update the saved app config with the validated value we just retrieved
    appConfig[id] = el.val();

    // Send the config back to the tool
    console.info("Sending app config: " + JSON.stringify(appConfig));
    fabmo.setAppConfig(appConfig);
});

$('#hole-diameter').on('change', function(){
    $('#beam-width').attr('data-parsley-min', parseFloat($('#hole-diameter').val()) * 3);
    $('#hole-diameter').attr('data-parsley-max', parseFloat($('#beam-width').val()) / 3);
});

$('#hole-spacing').on('change', function(){
	
	$('.modal-content p').html('The overall length of your beam will be ' + ( parseFloat($('#hole-spacing').val()) + parseFloat(($('#beam-width').val())))); 
    	 $('.modal, .modal-container').fadeIn();
      //$('.settings').hide();
	
});

$('#bit-diameter').on('change', function(){
    var bitDiameter = $('#bit-diameter').val();
    $('#hole-diameter').attr('data-parsley-min', bitDiameter);
});

$('#check-triangle').on('click', function (){
    if ($('#check-triangle').prop('checked')) {
        $('#change-image').attr("src","images/triangles.png");
    } else {
        $('#change-image').attr("src","images/straight.png");
    }
});

$('.exit-modal').on('click', function (){
    $('.modal, .modal-container').fadeOut('fast');
});

$('.basic-link').on('click', function (evt){
    evt.preventDefault();
    $('.lock').hide();
    $('.unlock').hide();
    $('.advanced').hide();
    $('.advanced').attr("disabled", "true");
    $('.basic').show();
});

$('.advanced-link').on('click', function (evt){
    evt.preventDefault();
    $('.advanced').attr("disabled", "true");
    $('.basic').hide();
    $('.advanced').show();
    $('.lock').show();
    $('.unlock').hide();
    $('.parsley-required').hide();
});

$('.lock').on('click', function (evt) {
     evt.preventDefault();   
    $('.lock').hide();
    $('.unlock').show();
    $('.lockable').removeAttr('disabled');
});

$('.unlock').on('click', function (evt) {
    evt.preventDefault();
    $('.lock').show();
    $('.unlock').hide();
    $('.lockable').attr("disabled", "true");
});

$('#submit').on('click', function (){
    $('.basic-setting').parsley().on('form:submit', function() {
        
        // start creating file 
        if ($('#check-triangle').prop('checked')) {
          hasTriangles = true;
        } else {
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
        var cutDepth = (thickness + thruCut);   
		
		var maxPlunge = bitDiameter * .75;
		var passes = Math.ceil(cutDepth/maxPlunge);
		var plunge = (0-(cutDepth/passes)).toFixed(5);

		
		
        var safeZ = parseFloat($('#safe-Z').val());

        //calculated values
        var beamRadius = beamWidth / 2;
        var bitRadius = bitDiameter / 2;		
        var startY = beamRadius;
        var startX = beamRadius;

        if (hasTriangles){
            // triangle vals
            var flipX = -1; // used to flip the X-axis orientation of pairs of triangle cutouts
            var moveY = 0;  // a counter to offset pairs of cutouts in Y
            var centerY = ((holeSpacing / 2) + startY); // Find the center of the beam to place the first triangle
            var triangleSideLength = ((beamWidth * 0.6)  - bitRadius);   //size triangle to beam width   
            var triangleXOffset = ((triangleSideLength * Math.cos(.5235988))  / 2);
            var triangleYOffset = (triangleSideLength + bitDiameter);
            
            // cut first triangle in center of beam
            var shopbotCode = [         
                "'Bit Diameter: " + bitDiameter ,
                //"VC, " + bitDiameter,
                "'Safe Z",
                "MZ, " + safeZ,
                "'Spindle On",
                "SO, 1,1",
                "MS," + speed,
                "pause 3",          
                "J2, " + (startX + triangleXOffset).toFixed(2) + "," + centerY ,
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
                    "J2, " + (startX + (flipX * triangleXOffset)).toFixed(2) + ", " +  (centerY + nextPair).toFixed(2),
                    "MZ, " + cutDepth,
                    "M2, " + (startX + (flipX * (0 - triangleXOffset))).toFixed(2) + ", " +  ((centerY + nextPair) + (triangleSideLength / 2)).toFixed(2),          
                    "MY, " + ((centerY + nextPair) - ( triangleSideLength / 2)).toFixed(2),             
                    "M2, " + (startX + (flipX * triangleXOffset)).toFixed(2) + ", " +  (centerY  + nextPair).toFixed(2),            
                    "MZ, " + safeZ,
                    "J2, " + (startX + (flipX * triangleXOffset)) .toFixed(2)+ ", " +  (centerY  - nextPair).toFixed(2),
                    "MZ, " + cutDepth,
                    "M2, " + (startX + (flipX * (0 - triangleXOffset))).toFixed(2) + ", " +  ((centerY  - nextPair) + (triangleSideLength / 2)).toFixed(2), 
                    "MY, " + ((centerY - nextPair) - ( triangleSideLength / 2)).toFixed(2),
                    "M2, " + (startX + (flipX * triangleXOffset)).toFixed(2) + ", " +  (centerY  - nextPair).toFixed(2),
                    "MZ, " + safeZ              
                )
                flipX = flipX * -1; 
                nextPair = nextPair + triangleYOffset;              
            }           

            // drill holes 
				
				 shopbotCode.push(
					"CP, " + (holeDiameter - bitDiameter) + "," + startX + "," + startY + ",T,,,," + plunge + "," + passes + ",,,4,,1",
					"MZ, " + safeZ,
					"CP, " + (holeDiameter - bitDiameter) + "," + startX  + "," + (startY  + holeSpacing).toFixed(2) + ",T,,,," + plunge + "," + passes + ",,,4,,1",
					"MZ, " + safeZ,
					"M2, " + (startX + ((beamWidth + bitDiameter)/2) )+ "," + startY,
					"MZ, 0"
				)
			
			//then cut out
			
			var passNum = 0
			
			while (passNum < passes) {
				shopbotCode.push (
				
					"M3, " + (startX + beamRadius + bitRadius) + "," + (startY + holeSpacing) + "," + (passNum + 1) * plunge, 
					"CP, " + (beamWidth + bitDiameter) + "," + startX + "," + (startY + holeSpacing).toFixed(2) + ",T,-1,90,270,,,,,,1,",
					"CP, " + (beamWidth + bitDiameter) + "," + startX + "," + startY + ",T,-1,270,90,,,,,,1,"
				)
				
            passNum ++			
			}
			
			//close it all up
				shopbotCode.push (		
				"M3, " + (startX + beamRadius + bitRadius)+ "," + (startY + holeSpacing) + "," + 	(0 - cutDepth),		
				"MZ," + safeZ,
				"M2, 0,0"
				 )
			
        } else {
            // no triangles
            var shopbotCode = [ 
                "'Bit Diameter: " + bitDiameter,
                //"VC, " + bitDiameter,
                "'Safe Z",
                "MZ," + safeZ,
                "'Spindle On",
                "SO,1,1",
                "MS," + speed,
                "PAUSE 3",
                 
            ];
			    // drill holes
					
             shopbotCode.push(
				"CP, " + (holeDiameter - bitDiameter) + "," + startX + "," + startY + ",T,,,," + plunge + "," + passes + ",,,4,,1",
				"MZ, " + safeZ,
				"CP, " + (holeDiameter - bitDiameter) + "," + startX  + "," + (startY  + holeSpacing).toFixed(2) + ",T,,,," + plunge + "," + passes + ",,,4,,1",
				"MZ, " + safeZ,
				"M2, " + (startX + ((beamWidth + bitDiameter)/2) )+ "," + startY,
				"MZ, 0"
			)
			
			//and finally cut out
			
			var passNum = 0
			
			while (passNum < passes) {
				shopbotCode.push (
				
				"M3, " + (startX + beamRadius + bitRadius) + "," + (startY + holeSpacing) + "," + (passNum + 1) * plunge, 
				"CP, " + (beamWidth + bitDiameter) + "," + startX + "," + (startY + holeSpacing).toFixed(2) + ",T,-1,90,270,,,,,,1,",
				"CP, " + (beamWidth + bitDiameter) + "," + startX + "," + startY + ",T,-1,270,90,,,,,,1,"
				
				)
				passNum ++			
				}
				//close it up
				shopbotCode.push (		
				"M3, " + (startX + beamRadius + bitRadius) + ", " + (startY + holeSpacing) + ", " + 	(0 - cutDepth),		
				"MZ," + safeZ,
				"M2, 0,0"
			 )
        } 
		


		
		//ready to go 
        var beamerCode = shopbotCode.join('\n');

        fabmo.submitJob({
            file: beamerCode,
            filename : 'beamer-' + holeSpacing.toFixed(2) + 'x' + beamWidth.toFixed(2) + '.sbp',
            name : 'Beamer',
            description : 'Cut a beam with ' + holeDiameter + '" diameter holes that are ' + holeSpacing + '" apart' 
        });
    }); // $('.basic-setting').parsley().on('form:submit');
}); // $('#submit').on('click');