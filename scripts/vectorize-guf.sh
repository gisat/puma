# provided large tif file
tif="$1"



# make tiles from provided tif
rm -rf tiles-tif
mkdir tiles-tif
python mtile.py -ts 5001 5001 -o tiles-tif/ source-files/$tif



# vectorize tiles
rm -rf tiles-shp
mkdir tiles-shp
cd tiles-tif
for file in ./*
do
  gdal_polygonize.py "$file" -f "ESRI Shapefile" ../tiles-shp/"${file%.*}.shp" UF
done
cd -



# remove Line string SHP's - zones without any polygon; maybe it can be managed better way
cd tiles-shp
for file in ./*.shp
do
	# filenamebase: found filename without extension
  filebasename=${file%.shp}
  filebasename=${filebasename#./}
  if ogrinfo $file | grep -q 'Line String'; then
    # remove .shp, .shx, .dbf, ...
    echo "removing $filebasename.*"
    find ./ -type f -name "$filebasename.*" -delete
  fi
done
cd -


result="./result-shp/${tif%.*}.shp"
mkdir -p result-shp


# merge SHP tiles
for file in ./tiles-shp/*.shp
do
  if [ -f "$file" ]
  then
    echo "appending shp: $file to $result"
    ogr2ogr -f 'ESRI Shapefile' -update -append "$result" "$file"
  else
    echo "merging..."
    ogr2ogr -f 'ESRI Shapefile' "$result" "$file"
  fi
done


# change UF value 255 to 1
ogrinfo $result -dialect SQLite -sql "UPDATE ${tif%.*} SET UF = CAST(UF>0 AS integer(11))"

# add FID field
ogrinfo $result -sql "ALTER TABLE ${tif%.*} ADD COLUMN fid integer(11)"

# Add another ID field
ogrinfo $result -sql "ALTER TABLE ${tif%.*} ADD COLUMN id_geom integer(11)"



