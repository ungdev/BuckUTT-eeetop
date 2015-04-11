import http.server
import socketserver
import urllib
import telnetlib
import math

PORT = 8006
LENGTH = 20

def connect():
    return telnetlib.Telnet("127.0.0.1", 13666)

def send(tn, request):
    tn.write((request+"\n").encode('ascii'))

def writeLine(tn, line, text):
    nbSpaces = math.floor((LENGTH-len(text))/2)
    spaces = ''
    for i in range(0,nbSpaces):
        spaces += ' '
    send(tn, 'widget_set perte line'+str(line)+' 1 '+str(line)+' \"'+spaces+text+'\"')

def configPertelian(tn):
    send(tn, "hello")
    send(tn, "client_set name pertelian")
    send(tn, "screen_add perte")
    send(tn, "widget_add perte line1 string")
    send(tn, "widget_add perte line2 string")
    send(tn, "widget_add perte line3 string")
    send(tn, "widget_add perte line4 string")

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Parse query data & params to find out what was passed
        parsedParams = urllib.parse.urlparse(self.path)
        print(parsedParams)

        queryParsed = urllib.parse.parse_qs(parsedParams.query)

        if 'l1' not in queryParsed:
            queryParsed['l1'] = ['']
        if 'l2' not in queryParsed:
            queryParsed['l2'] = ['']
        if 'l3' not in queryParsed:
            queryParsed['l3'] = ['']
        if 'l4' not in queryParsed:
            queryParsed['l4'] = ['']

        writeLine(tn, 1, queryParsed['l1'][0])
        writeLine(tn, 2, queryParsed['l2'][0])
        writeLine(tn, 3, queryParsed['l3'][0])
        writeLine(tn, 4, queryParsed['l4'][0])

        if parsedParams.path == "/device.html":
            hostname = open("/etc/hostname", "r")
            deviceId = hostname.readline()
            hostname.close()
            self.send_response(200)
            self.send_header("Content-type", "text/html")
            self.send_header("Content-length", len(str(deviceId)))
            self.end_headers()
            self.wfile.write(str(deviceId).encode('ascii'))
        else:
            http.server.SimpleHTTPRequestHandler.do_GET(self);

tn = connect()
configPertelian(tn)
writeLine(tn, 2, 'WARNING')
writeLine(tn, 3, 'BuckUTT is coming !')

Handler = MyHandler

httpd = socketserver.TCPServer(("127.0.0.1", PORT), Handler)

print("Le serveur est lance sur le port", PORT)
httpd.serve_forever()
