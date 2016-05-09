#!/usr/bin/env python

# -------------------------
# vytvori z rastru dlazdoce
# o velikosti ts_x a ts_y
# 
# 2010-08-03 Vaclav Vobora, G2EUR
# -------------------------

import os
import re
import sys

try:
    from osgeo.gdalconst import *
    from osgeo import gdal
    from osgeo import ogr
    from osgeo import osr
except ImportError:
    from gdalconst import *
    import gdal
    import ogr
    import osr

# -------------------------
def Usage():
    name = os.path.basename(sys.argv[0])
    print 'Usage: %s [-of format] [-co NAME=VALUE]* [-ts ts_x ts_y]' % name 
    print '\t\t                    [-o dst_dir] [src_filename]'
    print ''
    sys.exit(1)
# -------------------------

# --------------
# Mainline
# --------------

co = []
ts_x = 2500
ts_y = 2000
format = 'GTiff'
src_filename = None
dst_dir = None

i = 1
while (i < len(sys.argv)):

    if (sys.argv[i] == '-of'):
        format = (sys.argv[i+1])
        i = i + 1

    elif (sys.argv[i] == '-co'):
        co.append(sys.argv[i+1])
        i = i + 1

    elif (sys.argv[i] == '-ts'):
        ts_x = float(sys.argv[i+1])
        ts_y = float(sys.argv[i+2])
        i = i + 2

    elif (sys.argv[i] == '-o'):
        dst_dir = sys.argv[i+1]
        i = i + 1

    elif (src_filename is None):
        src_filename = sys.argv[i]

    else:
        Usage()

    i = i + 1

# end while

if (src_filename is None):
    Usage()
if (dst_dir is None):
    Usage()

print 'create option: %s' % co
print 'format: %s' % format
print 'ts: %s,%s' % (ts_x, ts_x)
print 'src_filename: %s' % src_filename
print 'dst_dir: %s' % dst_dir
# print '---'

ext = {'GTiff':'.tif', 'PCIDSK':'.pix', 'HFA':'.img', 'VRT':'.vrt', 'AAIGrig':'.asc'}

src_ds = gdal.Open(src_filename, GA_ReadOnly)
if (src_ds is None):
    print 'Could not open file!'
    sys.exit(1)

# print src_ds.RasterXSize
# print src_ds.RasterYSize

xpos = 0
ypos = 0
blockno = 0
blocksizex = ts_x
blocksizey = ts_y
xdim = src_ds.RasterXSize
ydim = src_ds.RasterYSize

while (ypos <= ydim):

    while (xpos <= xdim):

#         print xpos, ypos, blockno
#         print src_ds.RasterXSize
#         print src_ds.RasterYSize

        _blocksizex = blocksizex
        if (xpos + blocksizex) >= xdim:
            _blocksizex = (xdim - xpos) 

        _blocksizey = blocksizey
        if (ypos + blocksizey) >= ydim:
            _blocksizey = (ydim - ypos) 

        if ((_blocksizex != 0) and (_blocksizey != 0)):

            # dst_filename = os.path.join(dst_dir, os.path.splitext(os.path.basename(src_filename))[0] + '_' + str(blockno) + ext[format])
            dst_filename = os.path.join(dst_dir, '%s_%.6d%s' % (os.path.splitext(os.path.basename(src_filename))[0], blockno, ext[format]))
        
            if co:
                cmd = 'gdal_translate -of %s %s -srcwin %s %s %s %s %s %s' % (format, '-co ' + ' -co '.join(co), xpos, ypos, _blocksizex, _blocksizey, src_filename, dst_filename)

            else:
                cmd = 'gdal_translate -of %s -srcwin %s %s %s %s %s %s' % (format, xpos, ypos, _blocksizex, _blocksizey, src_filename, dst_filename)

            # end if
            
            # testovaci prikaz
            # cmd = 'gdal_translate -srcwin %s %s %s %s %s %s' % (xpos, ypos, _blocksizex, _blocksizey, src_filename, dst_filename)

            print cmd
            os.system(cmd)

            # vytvoreni pyramid, pouze pro GTiff
            # cmd = 'gdaladdo --config HFA_USE_RRD YES --config USE_RRD YES %s 2 4 8' % (dst_filename)
            # print cmd

            # os.system(cmd)

        # end if

        # print '# ---' 
        blockno = blockno + 1
        xpos = xpos + blocksizex

    # end while

    ypos = ypos + blocksizey
    xpos = 0

# end while

src_ds = None
