import http.server
import socketserver
import urllib
import telnetlib
import math
import time
from threading import Thread

PORT = 8006
LENGTH = 20
ALLOWED = "http://10.0.0.1"
tn = None

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

class telnetLogin(Thread):
    global tn
    def run(self):
        global tn
        while True:
            if tn == None:
                try:
                    tn = connect()
                    configPertelian(tn)
                    writeLine(tn, 2, 'WARNING')
                    writeLine(tn, 3, 'BuckUTT is coming !')
                except ConnectionRefusedError:
                    print("Connexion au Pertelian échouée. Nouvel essai dans 60 secondes...")
            time.sleep(60)

class MyHandler(http.server.SimpleHTTPRequestHandler):
    global tn
    def do_GET(self):
        global tn

        # Parse query data & params to find out what was passed
        parsedParams = urllib.parse.urlparse(self.path)
        print(parsedParams)

        queryParsed = urllib.parse.parse_qs(parsedParams.query)

        if parsedParams.path == "/device.html":
            hostname = open("/etc/hostname", "r")
            deviceId = hostname.readline()
            hostname.close()
            idStr = deviceId.replace("\n", "")
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Content-length", len(str('{"device": "'+idStr+'"}').encode('ascii')))
            self.send_header("Access-Control-Allow-Origin", ALLOWED)
            self.end_headers()
            self.wfile.write(str('{"device": "'+idStr+'"}').encode('ascii'))
        elif parsedParams.path == "/update.html":
            try:
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
            except:
                tn = None
                print("Connexion au Pertelian perdue. Reconnexion en cours...")

            http.server.SimpleHTTPRequestHandler.do_GET(self)
        else:
            http.server.SimpleHTTPRequestHandler.do_GET(self)

Handler = MyHandler

httpd = socketserver.TCPServer(("127.0.0.1", PORT), Handler)

threadTelnet = telnetLogin()
threadTelnet.start()

try:
    print("Le serveur est lance sur le port", PORT)
    httpd.serve_forever()
except:
    httpd.shutdown()
    httpd.server_close()
