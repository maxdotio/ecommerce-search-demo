split -l 303922 -d --additional-suffix=.jsonl esci-s-products.jsonl esci-s_part_

mighty-batch --threads 4 --workers 8 --host 172.30.1.41 --jsonl esci-s_part_00.jsonl --property text --sentence-transformers
mighty-batch --threads 4 --workers 8 --host 172.30.1.41 --jsonl esci-s_part_01.jsonl --property text --sentence-transformers
mighty-batch --threads 4 --workers 8 --host 172.30.1.41 --jsonl esci-s_part_02.jsonl --property text --sentence-transformers
mighty-batch --threads 4 --workers 8 --host 172.30.1.41 --jsonl esci-s_part_03.jsonl --property text --sentence-transformers
mighty-batch --threads 4 --workers 8 --host 172.30.1.41 --jsonl esci-s_part_04.jsonl --property text --sentence-transformers