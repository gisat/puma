#!/usr/bin/env bash
pkill -TERM -P `cat .nohup.pid`
kill -9 `cat .nohup.pid`
sleep 5
unlink .nohup.pid
mv .nohup.log log/puma.$(date +%Y-%m-%d_%H.%M.%S).log
